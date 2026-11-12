import { CUMPLE } from '../config'
import { clamp, damp } from '../util/matematicas'

/**
 * Soplar las velas con el micrófono (Web Audio).
 *
 * Soplar contra el micro del móvil produce un "viento" muy fuerte y grave (por debajo de ~900 Hz) que
 * hablar o el ruido de la habitación no alcanzan. Se mide la energía en graves y se compara con el ruido de
 * fondo, que se calibra solo. El micro solo funciona con HTTPS (o en localhost); si no hay micro o se deniega
 * el permiso, se sopla manteniendo pulsado un botón (`soplido.boton`).
 */
export const soplido = {
  /** 0..1: lo fuerte que se está soplando ahora mismo (micro o botón). */
  fuerza: 0,
  /** 0..1: nivel de graves del micro, para el medidor (aunque no llegue al umbral). */
  nivel: 0,
  /** 0..1: posición del umbral en el medidor (siempre en la mitad: de ahí en adelante, sopla). */
  umbral: 0.5,
  /** Botón «mantén pulsado para soplar» o barra espaciadora. */
  boton: false,
  /** Velas que siguen encendidas (lo escribe la tarta, lo lee la interfaz). */
  quedan: 0,
}

/** El medidor abarca ±24 dB alrededor del umbral, que queda justo en la mitad de la barra. */
const MEDIA_BARRA_DB = 24

type ConstructorAudio = typeof AudioContext

let ctx: AudioContext | null = null
let flujo: MediaStream | null = null
let analizador: AnalyserNode | null = null
let espectro: Float32Array<ArrayBuffer> | null = null
let sueloDb = -70
let calibrado = false

export const microDisponible = () =>
  typeof window !== 'undefined' && window.isSecureContext && !!navigator.mediaDevices?.getUserMedia

export const microActivo = () => analizador !== null

/**
 * Pide el micro y empieza a escuchar. Hay que llamarla desde un toque/clic: en iOS el audio solo arranca así
 * (la parte síncrona, antes del primer `await`, sigue dentro del gesto). Devuelve false si no se pudo.
 */
export async function encenderMicro(): Promise<boolean> {
  apagarMicro()
  if (!microDisponible()) return false
  const Ctor: ConstructorAudio | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: ConstructorAudio }).webkitAudioContext
  if (!Ctor) return false
  const contexto = new Ctor()
  ctx = contexto
  contexto.resume().catch(() => {})
  try {
    const s = await navigator.mediaDevices.getUserMedia({
      // Sin filtros: la supresión de ruido del móvil borraría justo el "viento" del soplido.
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    })
    if (ctx !== contexto) {
      // Se canceló mientras se pedía el permiso.
      s.getTracks().forEach((t) => t.stop())
      return false
    }
    flujo = s
    await contexto.resume().catch(() => {})
    const a = contexto.createAnalyser()
    a.fftSize = 1024
    a.smoothingTimeConstant = 0.25
    contexto.createMediaStreamSource(s).connect(a)
    analizador = a
    espectro = new Float32Array(a.frequencyBinCount)
    calibrado = false
    return true
  } catch {
    if (ctx === contexto) apagarMicro()
    return false
  }
}

export function apagarMicro() {
  flujo?.getTracks().forEach((t) => t.stop())
  flujo = null
  analizador = null
  espectro = null
  ctx?.close().catch(() => {})
  ctx = null
  soplido.nivel = 0
}

/** Energía media (dB) del micro entre 80 y 900 Hz. */
function gravesDb(a: AnalyserNode, datos: Float32Array<ArrayBuffer>, frecuenciaMuestreo: number) {
  a.getFloatFrequencyData(datos)
  const hz = frecuenciaMuestreo / a.fftSize
  const desde = Math.max(1, Math.round(80 / hz))
  const hasta = Math.max(desde + 1, Math.round(900 / hz))
  let potencia = 0
  for (let i = desde; i <= hasta; i++) {
    const db = datos[i]
    if (db > -200) potencia += 10 ** (db / 10)
  }
  return 10 * Math.log10(potencia / (hasta - desde + 1) + 1e-12)
}

/** Cada frame mientras se sopla: calcula `soplido.fuerza` (0..1) a partir del micro y del botón. */
export function actualizarSoplido(dt: number) {
  let micro = 0
  if (analizador && espectro && ctx) {
    const db = gravesDb(analizador, espectro, ctx.sampleRate)
    // Ruido de fondo: baja rápido y sube despacio, así un soplido de un par de segundos apenas lo mueve.
    if (!calibrado) {
      sueloDb = Math.min(db, -45)
      calibrado = true
    } else {
      sueloDb = damp(sueloDb, db, db < sueloDb ? 4 : 0.5, dt)
    }
    const umbral = Math.max(CUMPLE.umbralSoplidoDb, sueloDb + 10)
    micro = clamp((db - umbral) / 8, 0, 1)
    soplido.nivel = clamp(0.5 + (db - umbral) / (2 * MEDIA_BARRA_DB), 0, 1)
  }
  const objetivo = Math.max(micro, soplido.boton ? 1 : 0)
  soplido.fuerza = damp(soplido.fuerza, objetivo, objetivo > soplido.fuerza ? 20 : 8, dt)
  if (soplido.fuerza < 0.01) soplido.fuerza = 0
}
