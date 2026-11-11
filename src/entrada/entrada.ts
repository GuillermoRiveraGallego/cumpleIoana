import { useEffect } from 'react'
import { JUGADOR } from '../config'
import { useEstado } from '../estado'

/**
 * Estado de entrada compartido (mutable, sin re-renders). Lo escriben el teclado y la capa táctil;
 * lo consumen el jugador, la cámara y el sistema de interacción dentro de useFrame.
 */
export const entrada = {
  /** Joystick virtual: x = derecha, y = adelante. Rango −1..1. */
  joystick: { x: 0, y: 0 },
  teclas: new Set<string>(),
  /** Giro de cámara acumulado desde el último frame (radianes). */
  mirar: { yaw: 0, pitch: 0 },
  zoom: 0,
  /** Toque/clic corto en pantalla, en coordenadas normalizadas (−1..1). */
  toque: null as { x: number; y: number } | null,
  interactuar: false,
  /** performance.now() de la última vez que el usuario movió la cámara a mano. */
  ultimaMiradaManual: -Infinity,
}

const ADELANTE = ['KeyW', 'ArrowUp']
const ATRAS = ['KeyS', 'ArrowDown']
const IZQUIERDA = ['KeyA', 'ArrowLeft']
const DERECHA = ['KeyD', 'ArrowRight']
const CORRER = ['ShiftLeft', 'ShiftRight']
const MOVIMIENTO = new Set([...ADELANTE, ...ATRAS, ...IZQUIERDA, ...DERECHA, ...CORRER])

const pulsada = (codigos: string[]) => (codigos.some((c) => entrada.teclas.has(c)) ? 1 : 0)

export interface Movimiento {
  x: number
  y: number
  correr: boolean
}

/** Combina teclado y joystick en un vector de longitud ≤ 1. */
export function leerMovimiento(out: Movimiento): Movimiento {
  let jx = entrada.joystick.x
  let jy = entrada.joystick.y
  const m = Math.hypot(jx, jy)
  const zm = JUGADOR.zonaMuertaJoystick
  if (m < zm) {
    jx = jy = 0
  } else {
    // Reescala para que justo al salir de la zona muerta la velocidad empiece en 0.
    const k = Math.min(1, (m - zm) / (1 - zm)) / m
    jx *= k
    jy *= k
  }
  out.x = pulsada(DERECHA) - pulsada(IZQUIERDA) + jx
  out.y = pulsada(ADELANTE) - pulsada(ATRAS) + jy
  const len = Math.hypot(out.x, out.y)
  if (len > 1) {
    out.x /= len
    out.y /= len
  }
  out.correr = pulsada(CORRER) === 1
  return out
}

/** Enter sobre un botón enfocado ya lo activa el navegador: no lo usamos también para interactuar. */
const sobreBoton = (e: KeyboardEvent) => (e.target as HTMLElement | null)?.tagName === 'BUTTON'

/** Teclado: WASD/flechas para moverse, Shift para correr, E/Enter para ver un cuadro, Esc para cerrar. */
export function useTeclado() {
  useEffect(() => {
    const abajo = (e: KeyboardEvent) => {
      const st = useEstado.getState()
      if (st.visor) {
        if (e.code === 'Escape') st.cerrarVisor()
        else if (e.code === 'ArrowLeft' || e.code === 'KeyA') st.moverVisor(-1)
        else if (e.code === 'ArrowRight' || e.code === 'KeyD') st.moverVisor(1)
        return
      }
      if (MOVIMIENTO.has(e.code)) {
        entrada.teclas.add(e.code)
        if (e.code.startsWith('Arrow')) e.preventDefault()
      } else if (!e.repeat && (e.code === 'KeyE' || (e.code === 'Enter' && !sobreBoton(e)))) {
        entrada.interactuar = true
      }
    }
    const arriba = (e: KeyboardEvent) => entrada.teclas.delete(e.code)
    const soltarTodo = () => entrada.teclas.clear()

    window.addEventListener('keydown', abajo)
    window.addEventListener('keyup', arriba)
    window.addEventListener('blur', soltarTodo)
    return () => {
      window.removeEventListener('keydown', abajo)
      window.removeEventListener('keyup', arriba)
      window.removeEventListener('blur', soltarTodo)
    }
  }, [])
}
