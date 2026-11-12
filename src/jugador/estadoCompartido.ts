import { Vector3 } from 'three'
import { CAMARA } from '../config'

/** Estado del jugador compartido entre sistemas (se actualiza cada frame, sin re-renders). */
export const jugador = {
  posicion: new Vector3(),
  velocidad: new Vector3(),
  /** Orientación (rad). 0 = mirando a +Z. */
  rotacionY: Math.PI,
  /** Rapidez real tras colisiones (m/s), suavizada. */
  rapidez: 0,
}

/** Órbita de la cámara alrededor del jugador. */
export const camara = {
  yaw: 0,
  pitch: CAMARA.pitchInicial,
  distancia: CAMARA.distancia,
  distanciaActual: CAMARA.distancia,
  /** Cuánto por encima del punto de órbita mira la cámara (se baja al soplar las velas, para ver la tarta). */
  alturaMirada: CAMARA.alturaMirada,
}
