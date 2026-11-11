import { SALA, VESTIBULO, temaDeSala, type Tema } from '../config'
import type { Foto, Sala } from '../galeria/datos'
import { caja, transformarCaja, type Caja } from './colisiones'

export type V3 = [number, number, number]

/**
 * Planta del museo (vista desde arriba, −Z = norte). El vestíbulo es una galería; las salas se reparten
 * en orden de visita: pared izquierda (de la entrada al fondo) → fondo → pared derecha (del fondo a la
 * entrada). Con 5 salas:
 *
 *                       ┌────────┐
 *                       │ Sala 3 │
 *                       └──┐  ┌──┘
 *         ┌────────┐ ┌─────┘  └─────┐ ┌────────┐
 *         │ Sala 2 ├─┤              ├─┤ Sala 4 │
 *         └────────┘ │  Vestíbulo   │ └────────┘
 *         ┌────────┐ │      ♥       │ ┌────────┐
 *         │ Sala 1 ├─┤              ├─┤ Sala 5 │
 *         └────────┘ └──── ▲ ───────┘ └────────┘
 *                         entrada
 *
 * Cada sala tiene la puerta en su +Z local; `giro` (cuartos de vuelta) la orienta hacia el vestíbulo.
 * Las salas crecen hacia fuera según su número de fotos, así que nunca chocan entre sí.
 */
export type Lado = 'norte' | 'este' | 'sur' | 'oeste'

export interface Ranura {
  foto: Foto
  posicion: V3
  rotacionY: number
  /** Tamaño de la foto (sin marco), en metros. */
  ancho: number
  alto: number
}

export interface EspacioSala {
  sala: Sala
  tema: Tema
  fondo: number
  posicion: V3
  giro: number
  ranuras: Ranura[]
  /** Posición Z (local) de cada banco, con su alfombra y su claraboya. */
  bancos: number[]
  /** Interior de la sala + media pared de la puerta (mundo). */
  limites: Caja
  /** Hueco de la puerta (mundo): la única forma de ver el interior desde fuera. */
  portal: Caja
}

/** Una pared del vestíbulo. Coordenadas locales: a lo largo de X, cara interior en z = 0 mirando a +Z. */
export interface ParedVestibulo {
  lado: Lado
  giro: number
  origen: V3
  largo: number
  /** Puertas (posición X local de su centro) y la sala a la que llevan. */
  puertas: { x: number; sala: Sala }[]
}

export interface Disposicion {
  salas: EspacioSala[]
  vestibulo: { ancho: number; largo: number; limites: Caja; paredes: ParedVestibulo[] }
  inicio: { posicion: V3; rotacionY: number }
}

/** Cuántos cuadros van en la pared del fondo y cuántos en cada pared lateral. */
export function repartoCuadros(n: number) {
  if (n <= 2) return { enFondo: n, porLado: 0 }
  const largoLado = SALA.fondoMin - 2 * SALA.margenEsquina
  const largoFondo = SALA.ancho - 2 * SALA.margenEsquina
  const capacidadMin = 2 * Math.floor(largoLado / SALA.pasoCuadros) + Math.floor(largoFondo / SALA.pasoCuadros)
  let enFondo =
    n <= capacidadMin
      ? Math.round((n * largoFondo) / (2 * largoLado + largoFondo)) // reparto proporcional en la sala mínima
      : n % 2 === 0
        ? 2
        : 3 // sala más larga: el fondo se queda con 2-3 y el resto va a los laterales
  // Laterales simétricos.
  if ((n - enFondo) % 2 === 1) enFondo++
  return { enFondo, porLado: (n - enFondo) / 2 }
}

export function fondoSala(n: number) {
  const { porLado } = repartoCuadros(n)
  return Math.max(SALA.fondoMin, 2 * SALA.margenEsquina + porLado * SALA.pasoCuadros)
}

/**
 * Coloca los cuadros en orden de visita: pared izquierda (de la entrada al fondo) → fondo →
 * pared derecha (del fondo a la entrada). El tamaño de cada cuadro se adapta a la proporción de su foto.
 */
function distribuirCuadros(fotos: Foto[], fondo: number): Ranura[] {
  const { enFondo, porLado } = repartoCuadros(fotos.length)
  const { ancho: W, margenEsquina: m, alturaCuadros: y } = SALA
  const largoLado = fondo - 2 * m
  const largoFondo = W - 2 * m

  const huecos: { posicion: V3; rotacionY: number; anchoMax: number }[] = []
  const repartir = (k: number, largo: number, f: (t: number) => { posicion: V3; rotacionY: number }) => {
    for (let i = 0; i < k; i++) {
      const t = -largo / 2 + (largo * (i + 0.5)) / k
      huecos.push({ ...f(t), anchoMax: Math.min(SALA.anchoMaxCuadro, (largo / k) * 0.7) })
    }
  }
  repartir(porLado, largoLado, (t) => ({ posicion: [-W / 2, y, -t], rotacionY: Math.PI / 2 }))
  repartir(enFondo, largoFondo, (t) => ({ posicion: [t, y, -fondo / 2], rotacionY: 0 }))
  repartir(porLado, largoLado, (t) => ({ posicion: [W / 2, y, t], rotacionY: -Math.PI / 2 }))

  return fotos.map((foto, i) => {
    const h = huecos[i]
    const ancho = Math.min(h.anchoMax, SALA.altoMaxCuadro * foto.aspecto)
    return { foto, posicion: h.posicion, rotacionY: h.rotacionY, ancho, alto: ancho / foto.aspecto }
  })
}

function posicionesBancos(fondo: number) {
  const n = fondo < 18 ? 1 : Math.round(fondo / 11)
  if (n === 1) return [-0.6]
  return Array.from({ length: n }, (_, i) => -fondo / 2 + (fondo * (i + 0.5)) / n)
}

/**
 * Tramos macizos de una pared con huecos de puerta (coordenadas locales de la pared: a lo largo de X,
 * cara interior en z = 0 y el grosor hacia −Z). Se alargan `grosor` por cada extremo para cerrar esquinas.
 */
export function tramosPared(largo: number, alto: number, puertas: number[], grosor: number) {
  const { puerta: P, altoPuerta: HP } = SALA
  const tramos: { centro: V3; tam: V3 }[] = []
  let desde = -largo / 2 - grosor
  for (const x of [...puertas].sort((a, b) => a - b)) {
    const hasta = x - P / 2
    if (hasta - desde > 1e-3) tramos.push({ centro: [(desde + hasta) / 2, alto / 2, -grosor / 2], tam: [hasta - desde, alto, grosor] })
    tramos.push({ centro: [x, (HP + alto) / 2, -grosor / 2], tam: [P, alto - HP, grosor] }) // dintel
    desde = x + P / 2
  }
  const hasta = largo / 2 + grosor
  tramos.push({ centro: [(desde + hasta) / 2, alto / 2, -grosor / 2], tam: [hasta - desde, alto, grosor] })
  return tramos
}

export function calcularDisposicion(salas: Sala[]): Disposicion {
  const { ancho: V, alto: HV, pasoSalas: S, margen: m } = VESTIBULO
  const { ancho: W, alto: H, grosor: T, puerta: P, altoPuerta: HP } = SALA

  const n = salas.length
  const izquierda = n <= 1 ? 0 : Math.ceil((n - 1) / 2)
  const derecha = n <= 1 ? 0 : Math.floor((n - 1) / 2)
  const L = Math.max(VESTIBULO.largoMin, Math.max(izquierda, derecha) * S + 2 * m)

  // Paredes del vestíbulo: `giro` hace que su +Z local mire hacia dentro; X local recorre la pared.
  const paredes: Record<Lado, ParedVestibulo> = {
    norte: { lado: 'norte', giro: 0, origen: [0, 0, -L / 2], largo: V, puertas: [] }, // X local = +x
    este: { lado: 'este', giro: 3, origen: [V / 2, 0, 0], largo: L, puertas: [] }, // X local = +z
    sur: { lado: 'sur', giro: 2, origen: [0, 0, L / 2], largo: V, puertas: [] }, // X local = −x
    oeste: { lado: 'oeste', giro: 1, origen: [-V / 2, 0, 0], largo: L, puertas: [] }, // X local = −z
  }

  const espacios = salas.map((sala, i): EspacioSala => {
    const fondo = fondoSala(sala.fotos.length)
    const separacion = 2 * T + fondo / 2 // paredes de sala y vestíbulo espalda con espalda: paso de 2 × grosor
    let lado: Lado
    let posicion: V3
    if (i < izquierda) {
      const z = L / 2 - m - S * (i + 0.5)
      lado = 'oeste'
      posicion = [-(V / 2 + separacion), 0, z]
      paredes.oeste.puertas.push({ x: -z, sala })
    } else if (i === izquierda) {
      lado = 'norte'
      posicion = [0, 0, -(L / 2 + separacion)]
      paredes.norte.puertas.push({ x: 0, sala })
    } else {
      const z = -L / 2 + m + S * (i - izquierda - 1 + 0.5)
      lado = 'este'
      posicion = [V / 2 + separacion, 0, z]
      paredes.este.puertas.push({ x: z, sala })
    }
    const giro = paredes[lado].giro
    return {
      sala,
      tema: temaDeSala(sala.orden),
      fondo,
      posicion,
      giro,
      ranuras: distribuirCuadros(sala.fotos, fondo),
      bancos: posicionesBancos(fondo),
      limites: transformarCaja(
        { minX: -W / 2, maxX: W / 2, minY: -1, maxY: H + 1, minZ: -fondo / 2, maxZ: fondo / 2 + T },
        posicion,
        giro,
      ),
      portal: transformarCaja(caja(0, HP / 2, fondo / 2 + T, P, HP, 2 * T), posicion, giro),
    }
  })

  return {
    salas: espacios,
    vestibulo: {
      ancho: V,
      largo: L,
      limites: caja(0, HV / 2, 0, V + 2 * T, HV + 2, L + 2 * T),
      paredes: [paredes.norte, paredes.este, paredes.sur, paredes.oeste],
    },
    // Junto a la entrada (sur), mirando hacia el fondo de la galería.
    inicio: { posicion: [0, 0, L / 2 - 5], rotacionY: Math.PI },
  }
}
