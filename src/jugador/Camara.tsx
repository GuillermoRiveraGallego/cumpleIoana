import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { Vector3, type PerspectiveCamera } from 'three'
import { CAMARA, JUGADOR } from '../config'
import { entrada } from '../entrada/entrada'
import { useEstado } from '../estado'
import { distanciaLibre } from '../mundo/colisiones'
import { clamp, damp, difAngulo } from '../util/matematicas'
import { camara, jugador } from './estadoCompartido'

/**
 * Cámara en tercera persona que orbita alrededor de Ioana.
 *  - yaw/pitch los mueve el usuario (dedo o ratón); la rueda cambia la distancia.
 *  - Si caminas sin tocar la cámara, se recoloca suavemente detrás de ella.
 *  - Un rayo contra las colisiones la acerca para que nunca atraviese paredes, suelo ni techo.
 */
export function CamaraTerceraPersona() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const size = useThree((s) => s.size)
  const tmp = useMemo(
    () => ({ objetivo: new Vector3(), suave: new Vector3(), dir: new Vector3(), mirar: new Vector3(), iniciada: false }),
    [],
  )

  // FOV adaptado a la pantalla: en vertical (móvil) se abre para no perder campo de visión lateral.
  useEffect(() => {
    const aspecto = size.width / Math.max(1, size.height)
    const hfov = (CAMARA.fovHorizontalMin * Math.PI) / 180
    const vfov = (2 * Math.atan(Math.tan(hfov / 2) / aspecto) * 180) / Math.PI
    camera.fov = clamp(vfov, 50, 78)
    camera.updateProjectionMatrix()
  }, [size.width, size.height, camera])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20)
    const { fase } = useEstado.getState()
    const { objetivo, suave, dir, mirar } = tmp

    // Entrada del usuario
    camara.yaw += entrada.mirar.yaw
    camara.pitch = clamp(camara.pitch + entrada.mirar.pitch, CAMARA.pitchMin, CAMARA.pitchMax)
    entrada.mirar.yaw = entrada.mirar.pitch = 0
    if (entrada.zoom !== 0) {
      camara.distancia = clamp(camara.distancia * Math.exp(entrada.zoom * 0.001), CAMARA.distanciaMin, CAMARA.distanciaMax)
      entrada.zoom = 0
    }

    const detras = jugador.rotacionY + Math.PI
    if (fase === 'intro') {
      // Balanceo lento de presentación.
      camara.yaw = detras + Math.sin(state.clock.elapsedTime * 0.25) * 0.35
    } else if (
      jugador.rapidez > 0.3 &&
      performance.now() - entrada.ultimaMiradaManual > CAMARA.esperaAutoSeguir * 1000
    ) {
      const dif = difAngulo(detras, camara.yaw)
      // Si caminas hacia la cámara no la giramos 180° de golpe.
      if (Math.abs(dif) < 2.4) {
        const fuerza = CAMARA.autoSeguir * Math.min(jugador.rapidez / JUGADOR.velocidad, 1)
        camara.yaw += dif * (1 - Math.exp(-fuerza * dt))
      }
    }

    // Punto de órbita (suavizado para absorber el rebote del paso).
    objetivo.set(jugador.posicion.x, jugador.posicion.y + CAMARA.altura, jugador.posicion.z)
    if (!tmp.iniciada) {
      suave.copy(objetivo)
      tmp.iniciada = true
    } else {
      suave.x = damp(suave.x, objetivo.x, 18, dt)
      suave.y = damp(suave.y, objetivo.y, 8, dt)
      suave.z = damp(suave.z, objetivo.z, 18, dt)
    }

    const cp = Math.cos(camara.pitch)
    dir.set(Math.sin(camara.yaw) * cp, Math.sin(camara.pitch), Math.cos(camara.yaw) * cp)
    const libre = distanciaLibre(suave, dir, camara.distancia, CAMARA.margen)
    // Sin mínimo artificial: si no cabe, se acerca hasta la cabeza (y Jugador oculta el modelo).
    const maxima = Math.max(0.02, Math.min(camara.distancia, libre))
    // Acercarse al chocar: instantáneo (nunca se ve a través de una pared). Alejarse: suave.
    camara.distanciaActual = maxima < camara.distanciaActual ? maxima : damp(camara.distanciaActual, maxima, 5, dt)

    // La dirección de la mirada se calcula como si la cámara estuviera a su distancia ideal; así, si una
    // pared la acerca, el encuadre no cambia (solo se acerca), en vez de acabar mirando al techo.
    mirar.set(0, camara.alturaMirada, 0).addScaledVector(dir, -camara.distancia)
    camera.position.copy(suave).addScaledVector(dir, camara.distanciaActual)
    mirar.add(camera.position)
    camera.lookAt(mirar)
  }, -1)

  return null
}
