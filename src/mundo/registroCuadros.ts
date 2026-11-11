import { Vector3, type Object3D } from 'three'
import { INTERACCION } from '../config'

export interface CuadroRegistrado {
  id: string
  salaId: string
  indice: number
  /** Centro del cuadro sobre la pared (mundo). */
  posicion: Vector3
  /** Normal horizontal de la pared, hacia dentro de la sala. */
  normal: Vector3
  ancho: number
  /** Malla que recibe toques/clics. */
  malla: Object3D
}

const cuadros = new Map<string, CuadroRegistrado>()

export function registrarCuadro(c: CuadroRegistrado) {
  cuadros.set(c.id, c)
  return () => {
    if (cuadros.get(c.id) === c) cuadros.delete(c.id)
  }
}

const v = new Vector3()

/** El cuadro que tienes delante y lo bastante cerca, o null. */
export function cuadroCercano(p: Vector3): CuadroRegistrado | null {
  let mejor: CuadroRegistrado | null = null
  let mejorPuntuacion = Infinity
  for (const c of cuadros.values()) {
    v.set(p.x - c.posicion.x, 0, p.z - c.posicion.z)
    const delante = v.dot(c.normal)
    if (delante < 0.05 || delante > INTERACCION.distanciaMax) continue
    const lateral = v.addScaledVector(c.normal, -delante).length()
    if (lateral > c.ancho / 2 + INTERACCION.margenLateral) continue
    const puntuacion = delante + lateral * 1.5
    if (puntuacion < mejorPuntuacion) {
      mejorPuntuacion = puntuacion
      mejor = c
    }
  }
  return mejor
}

export const mallasCuadros = () => Array.from(cuadros.values(), (c) => c.malla)

export function cuadroDeMalla(o: Object3D) {
  for (const c of cuadros.values()) if (c.malla === o) return c
  return undefined
}
