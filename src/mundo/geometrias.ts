import {
  BoxGeometry,
  BufferAttribute,
  CircleGeometry,
  Color,
  CylinderGeometry,
  IcosahedronGeometry,
  Matrix4,
  PlaneGeometry,
  Quaternion,
  Vector3,
  type BufferGeometry,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// Geometrías unitarias compartidas: cada objeto las reutiliza escalando la malla.
// Menos memoria y menos trabajo para la GPU del móvil.
export const PLANO = new PlaneGeometry(1, 1)
export const CAJA = new BoxGeometry(1, 1, 1)
export const CILINDRO = new CylinderGeometry(1, 1, 1, 14)
export const CIRCULO = new CircleGeometry(1, 20)
export const ICOSAEDRO = new IcosahedronGeometry(1, 1)

type V3 = [number, number, number]

/** Una pieza de un objeto compuesto: geometría unitaria + transformación + color. */
export interface Pieza {
  geometria: BufferGeometry
  matriz: Matrix4
  color: string
}

const EJE_X = new Vector3(1, 0, 0)

/** Matriz posición · giro en X · escala. */
export const trs = (posicion: V3, escala: V3 | number, rotacionX = 0) =>
  new Matrix4().compose(
    new Vector3(...posicion),
    new Quaternion().setFromAxisAngle(EJE_X, rotacionX),
    typeof escala === 'number' ? new Vector3(escala, escala, escala) : new Vector3(...escala),
  )

/** Sistema de referencia de una pared: posición + giro en Y. Se combina con `trs` para colocar piezas en ella. */
export const marcoEn = (posicion: V3, rotacionY = 0) =>
  new Matrix4().makeRotationY(rotacionY).setPosition(...posicion)

/** `trs` dentro de un sistema de referencia (p. ej. una pared). */
export const en = (marco: Matrix4, matriz: Matrix4) => marco.clone().multiply(matriz)

/**
 * Une varias piezas en UNA geometría con colores por vértice: un objeto de 5-8 piezas pasa a ser
 * una sola llamada de dibujo (draw call), que es lo que más cuesta en el móvil.
 * `conUV` conserva las coordenadas de textura (todas las piezas deben tenerlas).
 */
export function fusionar(piezas: Pieza[], conUV = false) {
  const partes = piezas.map(({ geometria, matriz, color }) => {
    const g = (geometria.index ? geometria.toNonIndexed() : geometria.clone()).applyMatrix4(matriz)
    const c = new Color(color) // ya en espacio lineal, como esperan los colores por vértice
    const n = g.getAttribute('position').count
    const colores = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) colores.set([c.r, c.g, c.b], i * 3)
    g.setAttribute('color', new BufferAttribute(colores, 3))
    if (!conUV) g.deleteAttribute('uv')
    return g
  })
  const unida = mergeGeometries(partes)!
  partes.forEach((p) => p.dispose())
  return unida
}
