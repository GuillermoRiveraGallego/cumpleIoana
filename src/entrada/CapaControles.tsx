import { useEffect, useRef } from 'react'
import { CAMARA } from '../config'
import { controlesBloqueados, useEstado } from '../estado'
import { entrada } from './entrada'

const RADIO_JOYSTICK = 56 // px de recorrido máximo de la palanca
const MEDIO_BASE = 66 // mitad del tamaño visual de la base (ver .joystick en CSS)

/** El joystick aparece donde pongas el pulgar dentro de esta zona (abajo a la izquierda). */
const enZonaJoystick = (x: number, y: number) =>
  x < window.innerWidth * 0.5 && y > window.innerHeight * 0.4

/**
 * Capa transparente sobre el canvas que gestiona todos los punteros:
 *  - táctil: un dedo en la zona del joystick camina; cualquier otro dedo gira la cámara (a la vez).
 *  - ratón: arrastrar gira la cámara; la rueda acerca/aleja.
 *  - un toque/clic corto sin arrastrar se convierte en "toque" (para abrir cuadros).
 */
export function CapaControles() {
  const esTactil = useEstado((s) => s.esTactil)
  // Mientras se soplan las velas no se camina: el joystick estorbaría delante de la tarta.
  const soplando = useEstado((s) => s.velas === 'soplando')
  const capa = useRef<HTMLDivElement>(null)
  const base = useRef<HTMLDivElement>(null)
  const palanca = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = capa.current!
    let idJoystick: number | null = null
    let idMirar: number | null = null
    let tipoMirar = 'mouse'
    const origen = { x: 0, y: 0 }
    const ultimo = { x: 0, y: 0 }
    let inicio = 0
    let recorrido = 0

    const soltarJoystick = () => {
      idJoystick = null
      entrada.joystick.x = entrada.joystick.y = 0
      if (palanca.current) palanca.current.style.transform = ''
      if (base.current) {
        base.current.style.left = ''
        base.current.style.top = ''
        base.current.style.bottom = ''
        base.current.classList.remove('activo')
      }
    }

    const abajo = (e: PointerEvent) => {
      if (controlesBloqueados()) return
      const tactil = e.pointerType !== 'mouse'
      if (tactil && !useEstado.getState().esTactil) useEstado.getState().setTactil()

      if (tactil && idJoystick === null && enZonaJoystick(e.clientX, e.clientY)) {
        idJoystick = e.pointerId
        // La base se centra bajo el pulgar (sin salirse de la pantalla).
        origen.x = Math.max(MEDIO_BASE + 8, e.clientX)
        origen.y = Math.min(window.innerHeight - MEDIO_BASE - 8, e.clientY)
        if (base.current) {
          base.current.style.left = `${origen.x - MEDIO_BASE}px`
          base.current.style.top = `${origen.y - MEDIO_BASE}px`
          base.current.style.bottom = 'auto'
          base.current.classList.add('activo')
        }
        el.setPointerCapture(e.pointerId)
        mover(e)
        return
      }

      if (idMirar === null && (tactil || e.button === 0 || e.button === 2)) {
        idMirar = e.pointerId
        tipoMirar = e.pointerType
        ultimo.x = e.clientX
        ultimo.y = e.clientY
        inicio = performance.now()
        recorrido = 0
        el.setPointerCapture(e.pointerId)
        if (!tactil) el.classList.add('arrastrando')
      }
    }

    const mover = (e: PointerEvent) => {
      if (e.pointerId === idJoystick) {
        let dx = e.clientX - origen.x
        let dy = e.clientY - origen.y
        const d = Math.hypot(dx, dy)
        if (d > RADIO_JOYSTICK) {
          dx *= RADIO_JOYSTICK / d
          dy *= RADIO_JOYSTICK / d
        }
        if (palanca.current) palanca.current.style.transform = `translate(${dx}px, ${dy}px)`
        entrada.joystick.x = dx / RADIO_JOYSTICK
        entrada.joystick.y = -dy / RADIO_JOYSTICK
      } else if (e.pointerId === idMirar) {
        const dx = e.clientX - ultimo.x
        const dy = e.clientY - ultimo.y
        ultimo.x = e.clientX
        ultimo.y = e.clientY
        recorrido += Math.abs(dx) + Math.abs(dy)
        const sens = tipoMirar === 'mouse' ? CAMARA.sensRaton : CAMARA.sensTactil
        // Arrastrar a la derecha = mirar a la derecha; hacia arriba = mirar hacia arriba.
        entrada.mirar.yaw -= dx * sens
        entrada.mirar.pitch += dy * sens * 0.8
        if (recorrido > 6) entrada.ultimaMiradaManual = performance.now()
      }
    }

    const arriba = (e: PointerEvent) => {
      if (e.pointerId === idJoystick) {
        soltarJoystick()
      } else if (e.pointerId === idMirar) {
        idMirar = null
        el.classList.remove('arrastrando')
        const corto = performance.now() - inicio < 400
        if (e.type === 'pointerup' && corto && recorrido < 12) {
          const r = el.getBoundingClientRect()
          entrada.toque = {
            x: ((e.clientX - r.left) / r.width) * 2 - 1,
            y: -((e.clientY - r.top) / r.height) * 2 + 1,
          }
        }
      }
    }

    const rueda = (e: WheelEvent) => {
      e.preventDefault()
      if (!controlesBloqueados()) entrada.zoom += e.deltaY
    }
    const sinMenu = (e: Event) => e.preventDefault()

    // Si se abre un cuadro o vuelve la intro con el pulgar en el joystick, se suelta.
    const desuscribir = useEstado.subscribe((s, prev) => {
      if ((s.visor && !prev.visor) || s.fase !== prev.fase) {
        soltarJoystick()
        idMirar = null
      }
    })

    el.addEventListener('pointerdown', abajo)
    el.addEventListener('pointermove', mover)
    el.addEventListener('pointerup', arriba)
    el.addEventListener('pointercancel', arriba)
    el.addEventListener('wheel', rueda, { passive: false })
    el.addEventListener('contextmenu', sinMenu)
    // iOS: evita el zoom con gesto de pellizco en Safari.
    document.addEventListener('gesturestart', sinMenu)
    return () => {
      desuscribir()
      el.removeEventListener('pointerdown', abajo)
      el.removeEventListener('pointermove', mover)
      el.removeEventListener('pointerup', arriba)
      el.removeEventListener('pointercancel', arriba)
      el.removeEventListener('wheel', rueda)
      el.removeEventListener('contextmenu', sinMenu)
      document.removeEventListener('gesturestart', sinMenu)
    }
  }, [])

  return (
    <div ref={capa} className="capa-controles">
      {esTactil && (
        <div ref={base} className="joystick" aria-hidden style={soplando ? { visibility: 'hidden' } : undefined}>
          <div ref={palanca} className="joystick-palanca" />
        </div>
      )}
    </div>
  )
}
