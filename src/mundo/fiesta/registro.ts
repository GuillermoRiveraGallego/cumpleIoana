import { Vector3, type Object3D } from 'three'

/** La tarta, para tocarla en pantalla (Interaccion) y saber dónde está (mundo). */
export const tarta = {
  malla: null as Object3D | null,
  centro: new Vector3(),
}

export function registrarTarta(malla: Object3D, centro: Vector3) {
  tarta.malla = malla
  tarta.centro.copy(centro)
  return () => {
    if (tarta.malla === malla) tarta.malla = null
  }
}
