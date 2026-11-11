import { useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import { Matrix4, Vector4 } from 'three'
import { useEstado } from '../estado'
import { jugador } from '../jugador/estadoCompartido'
import type { Caja } from './colisiones'
import { actualizarVisibilidad, espacioEn, PANTALLA, type Rect } from './espacios'

/**
 * Cada frame, después de mover la cámara: decide qué salas se dibujan (solo las que pueden verse a través
 * de una puerta) y, cada poco, en qué espacio está Ioana (para el rótulo de la sala).
 */
export function Visibilidad() {
  const camera = useThree((s) => s.camera)
  const tmp = useMemo(() => ({ vistaProyeccion: new Matrix4(), v: new Vector4(), acumulado: 0 }), [])

  useFrame((_, delta) => {
    const st = useEstado.getState()
    camera.updateMatrixWorld()
    tmp.vistaProyeccion.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)

    /** Rectángulo que ocupa una caja en pantalla (null si queda fuera o detrás de la cámara). */
    const rectEnPantalla = (c: Caja): Rect | null => {
      let x0 = Infinity
      let x1 = -Infinity
      let y0 = Infinity
      let y1 = -Infinity
      let detras = 0
      for (let i = 0; i < 8; i++) {
        const v = tmp.v
          .set(i & 1 ? c.maxX : c.minX, i & 2 ? c.maxY : c.minY, i & 4 ? c.maxZ : c.minZ, 1)
          .applyMatrix4(tmp.vistaProyeccion)
        if (v.w <= 1e-4) {
          detras++
          continue
        }
        const x = v.x / v.w
        const y = v.y / v.w
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
      if (detras === 8) return null
      if (detras > 0) return PANTALLA // la caja cruza el plano de la cámara: mejor pasarse que quedarse corto
      const r = { x0: Math.max(x0, -1), x1: Math.min(x1, 1), y0: Math.max(y0, -1), y1: Math.min(y1, 1) }
      return r.x0 < r.x1 && r.y0 < r.y1 ? r : null
    }

    // Durante la portada se dibuja todo una vez: así las texturas suben a la GPU antes de empezar a caminar.
    actualizarVisibilidad(camera.position, rectEnPantalla, st.fase === 'intro')

    tmp.acumulado += delta
    if (tmp.acumulado > 0.2) {
      tmp.acumulado = 0
      const id = espacioEn(jugador.posicion)
      if (id && id !== st.espacioActual) st.setEspacioActual(id)
    }
  })

  return null
}
