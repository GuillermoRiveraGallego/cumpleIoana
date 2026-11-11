import { BoxGeometry, CircleGeometry, CylinderGeometry, IcosahedronGeometry, PlaneGeometry } from 'three'

// Geometrías unitarias compartidas: cada objeto las reutiliza escalando la malla.
// Menos memoria y menos trabajo para la GPU del móvil.
export const PLANO = new PlaneGeometry(1, 1)
export const CAJA = new BoxGeometry(1, 1, 1)
export const CILINDRO = new CylinderGeometry(1, 1, 1, 14)
export const CIRCULO = new CircleGeometry(1, 20)
export const ICOSAEDRO = new IcosahedronGeometry(1, 1)
