import type { Vector3 } from 'three'
import { clamp } from '../util/matematicas'

/**
 * Colisiones ligeras con cajas alineadas a los ejes (AABB). El museo es de una planta con paredes
 * rectas, así que basta con:
 *  - jugador = círculo en el plano XZ que se desliza por las cajas,
 *  - cámara  = rayo contra las cajas para no atravesar paredes, suelo ni techo.
 * Sin motor de físicas ni WASM: coste casi nulo en móvil.
 */
export interface Caja {
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ: number
  maxZ: number
  /** false = la cámara la ignora (bancos, plantas...). */
  camara?: boolean
  /** false = el jugador la atraviesa (suelo, techo...). */
  jugador?: boolean
}

const cajas = new Set<Caja>()

/** Caja a partir de centro y tamaño. */
export function caja(
  cx: number,
  cy: number,
  cz: number,
  sx: number,
  sy: number,
  sz: number,
  opciones: Pick<Caja, 'camara' | 'jugador'> = {},
): Caja {
  return {
    minX: cx - sx / 2,
    maxX: cx + sx / 2,
    minY: cy - sy / 2,
    maxY: cy + sy / 2,
    minZ: cz - sz / 2,
    maxZ: cz + sz / 2,
    ...opciones,
  }
}

/** Pasa una caja de coordenadas locales de una sala a coordenadas del mundo (giros de 90°). */
export function transformarCaja(c: Caja, posicion: [number, number, number], cuartosDeVuelta: number): Caja {
  const g = ((Math.round(cuartosDeVuelta) % 4) + 4) % 4
  // Mismo sentido que rotation.y de three.js: (x, z) → (x·cosθ + z·sinθ, −x·sinθ + z·cosθ)
  const rotar = (x: number, z: number): [number, number] =>
    g === 0 ? [x, z] : g === 1 ? [z, -x] : g === 2 ? [-x, -z] : [-z, x]
  const [ax, az] = rotar(c.minX, c.minZ)
  const [bx, bz] = rotar(c.maxX, c.maxZ)
  return {
    ...c,
    minX: Math.min(ax, bx) + posicion[0],
    maxX: Math.max(ax, bx) + posicion[0],
    minY: c.minY + posicion[1],
    maxY: c.maxY + posicion[1],
    minZ: Math.min(az, bz) + posicion[2],
    maxZ: Math.max(az, bz) + posicion[2],
  }
}

export function registrarCajas(lista: Caja[]) {
  lista.forEach((c) => cajas.add(c))
  return () => lista.forEach((c) => cajas.delete(c))
}

const ALTURA_JUGADOR = 1.5

/** Empuja un círculo (posición XZ del jugador) fuera de todas las cajas, deslizando por ellas. */
export function resolverCirculo(p: Vector3, radio: number) {
  const r2 = radio * radio
  for (let iteracion = 0; iteracion < 3; iteracion++) {
    let corregido = false
    for (const c of cajas) {
      if (c.jugador === false || c.maxY < 0.1 || c.minY > ALTURA_JUGADOR) continue
      const cx = clamp(p.x, c.minX, c.maxX)
      const cz = clamp(p.z, c.minZ, c.maxZ)
      const dx = p.x - cx
      const dz = p.z - cz
      const d2 = dx * dx + dz * dz
      if (d2 >= r2) continue
      if (d2 > 1e-10) {
        const d = Math.sqrt(d2)
        const k = (radio - d) / d
        p.x += dx * k
        p.z += dz * k
      } else {
        // El centro ha quedado dentro: sale por la cara más cercana.
        const izq = p.x - c.minX
        const der = c.maxX - p.x
        const atr = p.z - c.minZ
        const del = c.maxZ - p.z
        const m = Math.min(izq, der, atr, del)
        if (m === izq) p.x = c.minX - radio
        else if (m === der) p.x = c.maxX + radio
        else if (m === atr) p.z = c.minZ - radio
        else p.z = c.maxZ + radio
      }
      corregido = true
    }
    if (!corregido) break
  }
}

/** Intersección rayo–caja (método de los "slabs"), con la caja engordada `margen`. */
function rayoCaja(o: Vector3, d: Vector3, c: Caja, margen: number): number | null {
  let tmin = -Infinity
  let tmax = Infinity
  const ejes: [number, number, number, number][] = [
    [o.x, d.x, c.minX - margen, c.maxX + margen],
    [o.y, d.y, c.minY - margen, c.maxY + margen],
    [o.z, d.z, c.minZ - margen, c.maxZ + margen],
  ]
  for (const [oa, da, lo, hi] of ejes) {
    if (Math.abs(da) < 1e-9) {
      if (oa < lo || oa > hi) return null
      continue
    }
    let t1 = (lo - oa) / da
    let t2 = (hi - oa) / da
    if (t1 > t2) [t1, t2] = [t2, t1]
    if (t1 > tmin) tmin = t1
    if (t2 < tmax) tmax = t2
    if (tmin > tmax) return null
  }
  // Si el origen está dentro de la caja la ignoramos (evita que la cámara colapse).
  if (tmax < 0 || tmin < 0) return null
  return tmin
}

/** Distancia libre a lo largo de un rayo (dirección normalizada) antes de chocar con algo. */
export function distanciaLibre(origen: Vector3, direccion: Vector3, maxima: number, margen = 0) {
  let mejor = maxima
  for (const c of cajas) {
    if (c.camara === false) continue
    const t = rayoCaja(origen, direccion, c, margen)
    if (t !== null && t < mejor) mejor = t
  }
  return mejor
}
