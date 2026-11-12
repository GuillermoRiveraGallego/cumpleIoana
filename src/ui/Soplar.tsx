import { useEffect, useRef, useState, type PointerEvent as PE } from 'react'
import { apagarMicro, encenderMicro, microActivo, microDisponible, soplido } from '../entrada/microfono'
import { useEstado } from '../estado'
import { IconoCerrar, IconoMicro, IconoViento } from './Iconos'

/**
 * - inicio: pide un deseo y elige cómo soplar.
 * - pidiendo: esperando el permiso del micrófono.
 * - micro: escuchando; hay que soplar al micro.
 * - boton / sin-micro: se sopla manteniendo pulsado un botón (o la barra espaciadora).
 */
type Modo = 'inicio' | 'pidiendo' | 'micro' | 'boton' | 'sin-micro'

const textoQuedan = (n: number) => (n <= 0 ? '' : n === 1 ? '¡Solo queda una vela!' : `Quedan ${n} velas`)

/** Panel para soplar las velas: medidor del soplido, velas que quedan y, si hace falta, botón para soplar. */
export function Soplar() {
  const soplando = useEstado((s) => s.velas === 'soplando')
  const esTactil = useEstado((s) => s.esTactil)
  const dejar = useEstado((s) => s.dejarDeSoplar)
  const [modo, setModo] = useState<Modo>('inicio')
  const medidor = useRef<HTMLDivElement>(null)
  const relleno = useRef<HTMLDivElement>(null)
  const marca = useRef<HTMLDivElement>(null)
  const quedan = useRef<HTMLParagraphElement>(null)

  // Al abrirse elige el modo; al cerrarse apaga el micro.
  useEffect(() => {
    if (!soplando) return
    setModo(microDisponible() ? 'inicio' : 'boton')
    return () => {
      apagarMicro()
      soplido.boton = false
      soplido.quedan = 0
    }
  }, [soplando])

  // Medidor y contador de velas, fuera de React (cambian cada frame).
  useEffect(() => {
    if (!soplando) return
    let id = 0
    const bucle = () => {
      const conMicro = microActivo()
      const nivel = conMicro ? Math.max(soplido.nivel, soplido.fuerza) : soplido.fuerza
      if (relleno.current) relleno.current.style.transform = `scaleX(${nivel})`
      if (marca.current) {
        marca.current.style.left = `${soplido.umbral * 100}%`
        marca.current.style.display = conMicro ? '' : 'none'
      }
      medidor.current?.classList.toggle('activo', soplido.fuerza > 0.05)
      if (quedan.current) quedan.current.textContent = textoQuedan(soplido.quedan)
      id = requestAnimationFrame(bucle)
    }
    id = requestAnimationFrame(bucle)
    return () => cancelAnimationFrame(id)
  }, [soplando])

  if (!soplando) return null

  const usarMicro = async () => {
    setModo('pidiendo')
    const ok = await encenderMicro()
    if (useEstado.getState().velas !== 'soplando') {
      apagarMicro()
      return
    }
    // Si mientras tanto eligió soplar con el dedo, se queda así (el micro, si va, también cuenta).
    setModo((m) => (m === 'pidiendo' ? (ok ? 'micro' : 'sin-micro') : m))
  }

  const pulsar = (e: PE<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    soplido.boton = true
  }
  const soltar = () => {
    soplido.boton = false
  }

  const textos: Record<Exclude<Modo, 'inicio'>, string> = {
    pidiendo: 'Dale permiso para usar el micrófono…',
    micro: '¡Sopla fuerte al micrófono!',
    boton: esTactil ? 'Mantén pulsado el botón para soplar.' : 'Mantén pulsado el botón o la barra espaciadora para soplar.',
    'sin-micro': 'No he podido usar el micrófono. Mantén pulsado el botón para soplar.',
  }

  return (
    <div className="soplar" role="dialog" aria-label="Soplar las velas">
      <button className="soplar-cerrar" onClick={dejar} aria-label="Dejar de soplar">
        <IconoCerrar />
      </button>
      <h2>Pide un deseo…</h2>

      {modo === 'inicio' ? (
        <>
          <p>…y sopla al micrófono del {esTactil ? 'móvil' : 'ordenador'} para apagar las velas.</p>
          <button className="boton-principal soplar-micro" onClick={usarMicro}>
            <IconoMicro />
            Soplar al micrófono
          </button>
          <button className="soplar-enlace" onClick={() => setModo('boton')}>
            Prefiero no usar el micrófono
          </button>
        </>
      ) : (
        <>
          <p>{textos[modo]}</p>
          {modo !== 'pidiendo' && (
            <>
              <div ref={medidor} className="soplar-medidor" aria-hidden>
                <div ref={relleno} className="relleno" />
                <div ref={marca} className="marca" />
              </div>
              <p ref={quedan} className="soplar-quedan" aria-live="polite" />
            </>
          )}
          {modo === 'micro' || modo === 'pidiendo' ? (
            <button className="soplar-enlace" onClick={() => setModo('boton')}>
              ¿No funciona? Sopla con el dedo
            </button>
          ) : (
            <button
              className="boton-principal soplar-boton"
              onPointerDown={pulsar}
              onPointerUp={soltar}
              onPointerCancel={soltar}
              onLostPointerCapture={soltar}
              onContextMenu={(e) => e.preventDefault()}
            >
              <IconoViento />
              Mantén pulsado para soplar
            </button>
          )}
        </>
      )}
    </div>
  )
}
