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
  anio: number
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
  anio: number
  titulo: string
  subtitulo: string
  fotos: FotoManifest[]
}

export const NUM_SALAS = 4

const SUBTITULOS = ['Nuestro primer año', 'Nuestro segundo año', 'Nuestro tercer año', 'Nuestro cuarto año']
// Proporciones variadas para que los cuadros provisionales no parezcan clonados.
const ASPECTOS_PROVISIONALES = [4 / 3, 3 / 4, 4 / 3, 1, 3 / 4, 4 / 3, 3 / 4, 4 / 3]

export const urlRecurso = (ruta: string) => `${URL_BASE}${ruta}`

/** Lee public/galeria/manifest.json (generado a partir de /imagenes) y monta las 4 salas. */
export async function cargarSalas(): Promise<Sala[]> {
  let salas: SalaManifest[] = []
  try {
    const r = await fetch(urlRecurso('galeria/manifest.json'), { cache: 'no-cache' })
    if (r.ok) salas = ((await r.json()) as { salas?: SalaManifest[] }).salas ?? []
  } catch {
    // Sin manifest: todo provisional.
  }
  return Array.from({ length: NUM_SALAS }, (_, i) =>
    construirSala(
      i + 1,
      salas.find((s) => s.anio === i + 1),
    ),
  )
}

function construirSala(anio: number, datos?: SalaManifest): Sala {
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

  while (fotos.length < SALA.minCuadros) {
    const i = fotos.length
    fotos.push({
      id: `anio${anio}-provisional-${i + 1}`,
      indice: i,
      titulo: `Recuerdo ${i + 1}`,
      fecha: 'Próximamente',
      descripcion: `Aquí irá una de nuestras fotos del año ${anio}.`,
      pared: null,
      visor: null,
      aspecto: ASPECTOS_PROVISIONALES[i % ASPECTOS_PROVISIONALES.length],
      provisional: true,
    })
  }

  return {
    id: `anio${anio}`,
    anio,
    titulo: datos?.titulo || `Año ${anio}`,
    subtitulo: datos?.subtitulo || SUBTITULOS[anio - 1] || '',
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
