import type { Object3D, Vector3 } from 'three'
import type { Caja } from './colisiones'

/**
 * Espacios del museo (vestíbulo y salas) para dos cosas:
 *  1. Saber en qué sala está el jugador (rótulo al entrar).
 *  2. "Portal culling": cada sala es una caja cerrada cuyo único hueco es la puerta, así que si la puerta
 *     no está en el campo de visión, nada de su interior puede verse y no se dibuja. En el móvil esto evita
 *     pintar las 4 salas a la vez.
 */
export interface Espacio {
  id: string
  grupo: Object3D
  limites: Caja
  /** Hueco de la puerta que comunica con el vestíbulo (las salas). */
  portal?: Caja
  /** Se llama la primera vez que el espacio es visible (para cargar sus fotos). */
  alMostrar?: () => void
  mostrado?: boolean
}

export const ID_VESTIBULO = 'vestibulo'
export const ID_FIESTA = 'fiesta'

const espacios = new Map<string, Espacio>()

export function registrarEspacio(e: Espacio) {
  espacios.set(e.id, e)
  return () => {
    if (espacios.get(e.id) === e) espacios.delete(e.id)
  }
}

const dentro = (p: Vector3, c: Caja) => p.x >= c.minX && p.x <= c.maxX && p.z >= c.minZ && p.z <= c.maxZ

export function espacioEn(p: Vector3): string | null {
  for (const e of espacios.values()) if (dentro(p, e.limites)) return e.id
  return null
}

/** Rectángulo en pantalla, en coordenadas normalizadas (−1..1). */
export interface Rect {
  x0: number
  x1: number
  y0: number
  y1: number
}

export const PANTALLA: Rect = { x0: -1, x1: 1, y0: -1, y1: 1 }

const solapan = (a: Rect, b: Rect) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1

/**
 * Decide qué espacios se dibujan. `rectEnPantalla` proyecta un hueco de puerta a pantalla (null si no se ve).
 *  - Desde el vestíbulo: se dibuja cada sala cuya puerta está en pantalla.
 *  - Desde una sala: el resto del museo solo puede verse a través de SU puerta, así que otra sala se
 *    dibuja solo si su puerta, en pantalla, cae dentro del hueco de la nuestra.
 * `todoVisible` fuerza a dibujar todo (p. ej. durante la portada, para subir texturas a la GPU sin tirones),
 * pero las fotos solo se cargan para lo que realmente se ve.
 */
export function actualizarVisibilidad(
  camara: Vector3,
  rectEnPantalla: (c: Caja) => Rect | null,
  todoVisible = false,
) {
  const actual = espacioEn(camara)
  // Ventana a través de la que se ve el vestíbulo (y desde él, el resto de salas).
  let ventana: Rect | null = PANTALLA
  if (actual && actual !== ID_VESTIBULO) {
    const portal = espacios.get(actual)?.portal
    ventana = portal ? rectEnPantalla(portal) : null
  }

  for (const e of espacios.values()) {
    let visible: boolean
    if (!actual || e.id === actual) visible = true
    else if (e.id === ID_VESTIBULO) visible = ventana !== null
    else {
      const r = ventana && e.portal ? rectEnPantalla(e.portal) : null
      visible = !!(ventana && r && solapan(r, ventana))
    }

    if (visible && !e.mostrado) {
      e.mostrado = true
      e.alMostrar?.()
    }
    e.grupo.visible = visible || todoVisible
  }
}
