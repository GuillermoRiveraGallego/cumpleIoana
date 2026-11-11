// Procesa las fotos de /imagenes y genera versiones optimizadas para la web en /public/galeria.
//
//   imagenes/2022/*.jpg  ──►  public/galeria/2022/<nombre>-pared.webp   (textura del cuadro, ligera)
//                             public/galeria/2022/<nombre>-visor.webp   (vista ampliada, nítida)
//                             public/galeria/manifest.json              (lo que lee la web)
//
// Cada subcarpeta de /imagenes es una sala del museo, en orden de nombre (2022, 2023…). Las carpetas que
// empiezan por "_" o "." se ignoran (p. ej. "_descartes").
//
// Se ejecuta solo al arrancar `npm run dev` / `npm run build` (plugin de Vite) y cada vez que
// cambia algo en /imagenes mientras el servidor de desarrollo está abierto.
// También se puede lanzar a mano con `npm run fotos`.

import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const EXTENSIONES = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff'])
const NO_SOPORTADAS = new Set(['.heic', '.heif'])

/** Lado largo (px) de la textura que se pinta en la pared. Pequeña para no saturar la GPU del móvil. */
const TAM_PARED = 640
/** Lado largo (px) de la foto ampliada. */
const TAM_VISOR = 1600
const CALIDAD = 82
/** Súbelo si cambias tamaños/calidad para forzar que se regeneren todas. */
const VERSION = 1

const clave = (nombre) => nombre.normalize('NFC').trim().toLowerCase()
const texto = (v) => (typeof v === 'string' ? v.trim() : '')

function slug(nombre) {
  const s = nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return s || 'foto'
}

async function leerJson(ruta, avisar) {
  if (!existsSync(ruta)) return null
  try {
    // Quita el BOM que añade el Bloc de notas de Windows.
    return JSON.parse((await fs.readFile(ruta, 'utf8')).replace(/^﻿/, ''))
  } catch (e) {
    avisar?.(`No se pudo leer ${path.basename(path.dirname(ruta))}/${path.basename(ruta)}: ${e.message}`)
    return null
  }
}

/** Indexa los textos de info.json. Acepta claves con o sin extensión ("playa.jpg" o "playa"). */
function indexarTextos(fotos) {
  const porClave = new Map()
  const orden = []
  const añadir = (archivo, datos) => {
    if (typeof archivo !== 'string' || !datos || typeof datos !== 'object') return
    const k = clave(archivo)
    porClave.set(k, datos)
    orden.push(k)
  }
  if (Array.isArray(fotos)) fotos.forEach((f) => añadir(f?.archivo, f))
  else if (fotos && typeof fotos === 'object') Object.entries(fotos).forEach(([k, v]) => añadir(k, v))

  const buscar = (archivo) => {
    const conExt = clave(archivo)
    const sinExt = clave(path.parse(archivo).name)
    for (const k of [conExt, sinExt]) {
      if (porClave.has(k)) return { datos: porClave.get(k), posicion: orden.indexOf(k) }
    }
    return { datos: {}, posicion: -1 }
  }
  return buscar
}

async function limpiar(dir, rel, esperados) {
  let entradas = []
  try {
    entradas = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const e of entradas) {
    const r = rel ? `${rel}/${e.name}` : e.name
    const abs = path.join(dir, e.name)
    if (e.isDirectory()) {
      await limpiar(abs, r, esperados)
      if ((await fs.readdir(abs)).length === 0) await fs.rmdir(abs)
    } else if (!esperados.has(r)) {
      await fs.unlink(abs)
    }
  }
}

export async function procesarFotos({ raiz = process.cwd(), log = console.log } = {}) {
  const { default: sharp } = await import('sharp')
  const dirOrigen = path.join(raiz, 'imagenes')
  const dirDestino = path.join(raiz, 'public', 'galeria')
  await fs.mkdir(dirDestino, { recursive: true })

  const avisar = (m) => log(`⚠ ${m}`)
  const rutaCache = path.join(dirDestino, '.cache.json')
  const cache = (await leerJson(rutaCache)) ?? {}
  const nuevaCache = {}
  const esperados = new Set(['manifest.json', '.cache.json'])
  let generadas = 0
  let total = 0

  let carpetas = []
  try {
    carpetas = await fs.readdir(dirOrigen, { withFileTypes: true })
  } catch {
    avisar('No existe la carpeta imagenes/. Se usarán cuadros provisionales.')
  }

  const directorios = carpetas
    .filter((c) => c.isDirectory() && !/^[._]/.test(c.name))
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true, sensitivity: 'base' }))

  const salas = []
  const idsUsados = new Set()
  for (const carpeta of directorios) {
    const nombreCarpeta = carpeta.name.normalize('NFC').trim()
    let idSala = slug(nombreCarpeta)
    for (let i = 2; idsUsados.has(idSala); i++) idSala = `${slug(nombreCarpeta)}-${i}`
    idsUsados.add(idSala)
    const dirSala = path.join(dirOrigen, carpeta.name)
    const info = (await leerJson(path.join(dirSala, 'info.json'), avisar)) ?? {}
    const buscarTexto = indexarTextos(info.fotos)

    const archivos = []
    for (const f of await fs.readdir(dirSala, { withFileTypes: true })) {
      if (!f.isFile()) continue
      const ext = path.extname(f.name).toLowerCase()
      if (NO_SOPORTADAS.has(ext)) {
        avisar(`${nombreCarpeta}/${f.name}: el formato HEIC no está soportado. Expórtala como JPG.`)
      } else if (EXTENSIONES.has(ext)) {
        archivos.push(f.name)
      }
    }

    // Orden: primero el de info.json; el resto, alfabético (01_, 02_... funciona).
    archivos.sort((a, b) => {
      const pa = buscarTexto(a).posicion
      const pb = buscarTexto(b).posicion
      if (pa !== -1 && pb !== -1) return pa - pb
      if (pa !== -1) return -1
      if (pb !== -1) return 1
      return a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' })
    })

    const usados = new Set()
    const fotos = []
    for (const archivo of archivos) {
      const base = slug(path.parse(archivo).name)
      let nombre = base
      for (let i = 2; usados.has(nombre); i++) nombre = `${base}-${i}`
      usados.add(nombre)

      const entrada = path.join(dirSala, archivo)
      const st = await fs.stat(entrada)
      const firma = `${VERSION}:${TAM_PARED}:${TAM_VISOR}:${st.size}:${Math.round(st.mtimeMs)}`
      const relPared = `${idSala}/${nombre}-pared.webp`
      const relVisor = `${idSala}/${nombre}-visor.webp`
      const absPared = path.join(dirDestino, relPared)
      const absVisor = path.join(dirDestino, relVisor)
      const claveCache = `${idSala}/${archivo}`

      let datos = cache[claveCache]
      const vigente =
        datos && datos.firma === firma && datos.nombre === nombre && existsSync(absPared) && existsSync(absVisor)

      if (!vigente) {
        try {
          await fs.mkdir(path.dirname(absPared), { recursive: true })
          // rotate() sin argumentos aplica la orientación EXIF (fotos de móvil en vertical).
          const visor = await sharp(entrada, { failOn: 'none' })
            .rotate()
            .resize({ width: TAM_VISOR, height: TAM_VISOR, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: CALIDAD })
            .toFile(absVisor)
          await sharp(entrada, { failOn: 'none' })
            .rotate()
            .resize({ width: TAM_PARED, height: TAM_PARED, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: CALIDAD })
            .toFile(absPared)
          datos = { firma, nombre, ancho: visor.width, alto: visor.height }
          generadas++
        } catch (e) {
          avisar(`No se pudo procesar ${nombreCarpeta}/${archivo}: ${e.message}`)
          continue
        }
      }

      esperados.add(relPared)
      esperados.add(relVisor)
      nuevaCache[claveCache] = datos
      const t = buscarTexto(archivo).datos
      fotos.push({
        id: `${idSala}-${nombre}`,
        archivo,
        pared: `galeria/${relPared}`,
        visor: `galeria/${relVisor}`,
        ancho: datos.ancho,
        alto: datos.alto,
        titulo: texto(t.titulo),
        fecha: texto(t.fecha),
        descripcion: texto(t.descripcion),
      })
      total++
    }

    salas.push({
      id: `sala-${idSala}`,
      orden: salas.length + 1,
      carpeta: nombreCarpeta,
      titulo: texto(info.titulo),
      subtitulo: texto(info.subtitulo),
      fotos,
    })
  }

  await limpiar(dirDestino, '', esperados)

  const rutaManifest = path.join(dirDestino, 'manifest.json')
  const manifest = JSON.stringify({ version: 2, salas }, null, 2)
  const anterior = existsSync(rutaManifest) ? await fs.readFile(rutaManifest, 'utf8') : ''
  if (anterior !== manifest) await fs.writeFile(rutaManifest, manifest)
  await fs.writeFile(rutaCache, JSON.stringify(nuevaCache))

  log(`${total} foto(s) en ${salas.length} sala(s)${generadas ? `, ${generadas} procesada(s) ahora` : ''}.`)
  return { salas, generadas, total }
}

// Uso directo: `node scripts/procesar-fotos.mjs`
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  procesarFotos({ raiz, log: (m) => console.log(`[galería] ${m}`) }).catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
