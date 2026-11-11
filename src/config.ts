// Parámetros de ajuste del museo. Todo lo "tocable" está aquí.

const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

/** Dispositivo táctil (móvil / tablet): joystick visible y materiales más ligeros. */
export const ES_TACTIL = !!coarse

export const JUGADOR = {
  radio: 0.3, // radio de colisión (m)
  velocidad: 3.0, // m/s con el joystick a tope o con WASD
  velocidadCorrer: 5.2, // m/s con Shift (ordenador)
  aceleracion: 10,
  frenado: 14,
  giro: 13, // rapidez con la que se orienta hacia donde camina
  zonaMuertaJoystick: 0.12,
}

export const CAMARA = {
  distancia: 4.2,
  distanciaMin: 1.8,
  distanciaMax: 6.5,
  altura: 1.3, // punto alrededor del que orbita (≈ cara de Ioana)
  alturaMirada: 0.45, // la cámara mira un poco por encima: Ioana queda en la parte baja de la pantalla
  ocultarPersonajeA: 0.85, // si la cámara queda más cerca que esto (pegada a una pared), se oculta a Ioana
  pitchInicial: 0.3, // rad. Positivo = cámara por encima mirando hacia abajo
  pitchMin: -0.3,
  pitchMax: 1.15,
  sensTactil: 0.0075, // rad por píxel deslizado
  sensRaton: 0.0042,
  margen: 0.25, // distancia mínima a paredes, suelo y techo
  autoSeguir: 1.1, // con qué ganas se recoloca detrás al caminar
  esperaAutoSeguir: 1.6, // s sin tocar la cámara antes de recolocarse
  fovHorizontalMin: 64, // grados; en vertical (móvil) se amplía el FOV para no ver "por un tubo"
}

export const INTERACCION = {
  distanciaMax: 3.2, // a qué distancia de la pared aparece el botón "Ver recuerdo"
  margenLateral: 0.7,
  distanciaToque: 8, // tocar / hacer clic en un cuadro funciona hasta esta distancia
}

export const SALA = {
  ancho: 10,
  fondo: 12,
  alto: 4.2,
  grosor: 0.3,
  puerta: 2.6,
  altoPuerta: 3.0,
  alturaCuadros: 1.72, // centro de los cuadros
  altoMaxCuadro: 1.25,
  anchoMaxCuadro: 1.75,
  margenEsquina: 1.25,
  minCuadros: 6, // si hay menos fotos se rellenan con cuadros provisionales
}

export interface Tema {
  pared: string
  zocalo: string
  marco: string
  titulo: string
  provisional: [string, string]
  alfombra: [string, string, string]
}

/** Un tema de color por sala/año. */
export const TEMAS: Tema[] = [
  {
    pared: '#728c80',
    zocalo: '#f1e8db',
    marco: '#3a281d',
    titulo: '#f6eddc',
    provisional: ['#e9c9a8', '#b8826b'],
    alfombra: ['#8c3b2e', '#e3c79b', '#4f1f18'],
  },
  {
    pared: '#c08b80',
    zocalo: '#f4ebe1',
    marco: '#3d2a22',
    titulo: '#fff4ea',
    provisional: ['#f2d3c4', '#c98e86'],
    alfombra: ['#3f5466', '#e8d3b0', '#22303b'],
  },
  {
    pared: '#46646f',
    zocalo: '#efe6d8',
    marco: '#2f241d',
    titulo: '#f3e6cf',
    provisional: ['#b9d0d3', '#5f7f88'],
    alfombra: ['#9a5b3a', '#ecd5ab', '#5a2f1d'],
  },
  {
    pared: '#b56d4f',
    zocalo: '#f3e9dc',
    marco: '#33241b',
    titulo: '#fff1e2',
    provisional: ['#f0caa6', '#c47d58'],
    alfombra: ['#405a43', '#ead8b4', '#22331f'],
  },
]

export const temaDeAnio = (anio: number) => TEMAS[(anio - 1 + TEMAS.length) % TEMAS.length]

export const URL_BASE = import.meta.env.BASE_URL
