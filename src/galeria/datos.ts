import { SALA, URL_BASE } from '../config'

export interface Foto {
  id: string
  indice: number
  titulo: string
  fecha: string
  descripcion: string
  /** Textura ligera para el cuadro (null = provisional). */
  pared: string | null
  /** Versión grande para la vista ampliada. */
  visor: string | null
  /** ancho / alto */
  aspecto: number
  provisional: boolean
}

export interface Sala {
  id: string
  /** Posición en el recorrido: 1, 2, 3… (orden de las carpetas). */
  orden: number
  titulo: string
  subtitulo: string
  fotos: Foto[]
}

interface FotoManifest {
  id: string
  pared: string
  visor: string
  ancho: number
  alto: number
  titulo: string
  fecha: string
  descripcion: string
}

interface SalaManifest {
  id: string
  carpeta: string
  titulo: string
  subtitulo: string
  fotos: FotoManifest[]
}

const ORDINALES = ['primer', 'segundo', 'tercer', 'cuarto', 'quinto', 'sexto', 'séptimo', 'octavo', 'noveno', 'décimo']
const NUMEROS = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez']

/** "Cinco años, cinco salas" */
export function lemaMuseo(salas: number) {
  if (salas === 1) return 'Un año, una sala'
  const n = NUMEROS[salas] ?? String(salas)
  return `${n.charAt(0).toUpperCase()}${n.slice(1)} años, ${n} salas`
}
// Proporciones variadas para que los cuadros provisionales no parezcan clonados.
const ASPECTOS_PROVISIONALES = [4 / 3, 3 / 4, 4 / 3, 1, 3 / 4, 4 / 3, 3 / 4, 4 / 3]

export const urlRecurso = (ruta: string) => `${URL_BASE}${ruta}`

/**
 * Lee public/galeria/manifest.json (generado a partir de /imagenes) y monta una sala por carpeta,
 * en orden. Sin carpetas, el museo tiene una sala provisional.
 */
export async function cargarSalas(): Promise<Sala[]> {
  let salas: SalaManifest[] = []
  try {
    const r = await fetch(urlRecurso('galeria/manifest.json'), { cache: 'no-cache' })
    if (r.ok) salas = ((await r.json()) as { salas?: SalaManifest[] }).salas ?? []
  } catch {
    // Sin manifest: todo provisional.
  }
  if (salas.length === 0) return [construirSala(1)]
  return salas.map((s, i) => construirSala(i + 1, s))
}

function construirSala(orden: number, datos?: SalaManifest): Sala {
  const id = datos?.id ?? `sala-${orden}`
  const nombre = datos?.carpeta ?? `Sala ${orden}`
  const fotos: Foto[] = (datos?.fotos ?? []).map((f, i) => ({
    id: f.id,
    indice: i,
    titulo: f.titulo || `Recuerdo ${i + 1}`,
    fecha: f.fecha,
    descripcion: f.descripcion,
    pared: f.pared,
    visor: f.visor,
    aspecto: f.ancho > 0 && f.alto > 0 ? f.ancho / f.alto : 4 / 3,
    provisional: false,
  }))

  // Tantos cuadros como fotos. Solo una sala todavía vacía se rellena con provisionales.
  const provisionales = fotos.length === 0 ? SALA.cuadrosProvisionales : 0
  for (let i = 0; i < provisionales; i++) {
    fotos.push({
      id: `${id}-provisional-${i + 1}`,
      indice: i,
      titulo: `Recuerdo ${i + 1}`,
      fecha: 'Próximamente',
      descripcion: 'Aquí irá uno de nuestros recuerdos.',
      pared: null,
      visor: null,
      aspecto: ASPECTOS_PROVISIONALES[i % ASPECTOS_PROVISIONALES.length],
      provisional: true,
    })
  }

  return {
    id,
    orden,
    titulo: datos?.titulo || nombre.charAt(0).toUpperCase() + nombre.slice(1),
    subtitulo: datos?.subtitulo || (ORDINALES[orden - 1] ? `Nuestro ${ORDINALES[orden - 1]} año` : ''),
    fotos,
  }
}

/** Espera a que estén las fuentes (se usan para pintar textos en texturas). Máx. 3 s. */
export async function cargarFuentes() {
  if (!document.fonts) return
  const fuentes = [
    '600 64px "Cormorant Garamond"',
    'italic 500 32px "Cormorant Garamond"',
    '700 24px "Nunito"',
  ]
  await Promise.race([
    Promise.all(fuentes.map((f) => document.fonts.load(f).catch(() => null))),
    new Promise((r) => setTimeout(r, 3000)),
  ])
}
