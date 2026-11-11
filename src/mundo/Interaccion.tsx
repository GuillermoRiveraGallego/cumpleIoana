import { useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import { Raycaster, Vector2 } from 'three'
import { INTERACCION } from '../config'
import { entrada } from '../entrada/entrada'
import { useEstado } from '../estado'
import { jugador } from '../jugador/estadoCompartido'
import { distanciaLibre } from './colisiones'
import { cuadroCercano, cuadroDeMalla, mallasCuadros } from './registroCuadros'

/**
 * Detecta el cuadro que tienes delante (para el botón "Ver recuerdo"), y abre la vista ampliada
 * al pulsar E/Enter, el botón, o al tocar/hacer clic directamente sobre un cuadro.
 */
export function Interaccion() {
  const camera = useThree((s) => s.camera)
  const tmp = useMemo(() => ({ rayo: new Raycaster(), ndc: new Vector2(), acumulado: 0 }), [])

  useFrame((_, delta) => {
    const st = useEstado.getState()
    if (st.fase !== 'jugando' || st.visor) {
      entrada.toque = null
      entrada.interactuar = false
      return
    }

    // Cuadro cercano (no hace falta cada frame).
    tmp.acumulado += delta
    if (tmp.acumulado > 0.1) {
      tmp.acumulado = 0
      const c = cuadroCercano(jugador.posicion)
      if ((c?.id ?? null) !== (st.cercano?.id ?? null)) {
        st.setCercano(c ? { id: c.id, salaId: c.salaId, indice: c.indice } : null)
      }
    }

    if (entrada.interactuar) {
      entrada.interactuar = false
      const c = useEstado.getState().cercano
      if (c) st.abrirVisor(c)
    }

    if (entrada.toque) {
      tmp.ndc.set(entrada.toque.x, entrada.toque.y)
      entrada.toque = null
      tmp.rayo.setFromCamera(tmp.ndc, camera)
      const impacto = tmp.rayo.intersectObjects(mallasCuadros(), false)[0]
      if (!impacto) return
      // Que no haya una pared entre la cámara y el cuadro.
      const libre = distanciaLibre(tmp.rayo.ray.origin, tmp.rayo.ray.direction, impacto.distance + 1)
      if (libre + 0.02 < impacto.distance) return
      const c = cuadroDeMalla(impacto.object)
      if (c && c.posicion.distanceTo(jugador.posicion) < INTERACCION.distanciaToque) {
        st.abrirVisor({ id: c.id, salaId: c.salaId, indice: c.indice })
      }
    }
  })

  return null
}
