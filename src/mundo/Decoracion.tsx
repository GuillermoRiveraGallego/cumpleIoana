import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  CylinderGeometry,
  ExtrudeGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Shape,
  type BufferGeometry,
  type Group,
  type Matrix4,
} from 'three'
import { CAJA, CILINDRO, en, fusionar, ICOSAEDRO, PLANO, trs, type Pieza } from './geometrias'
import { texturaAlfombra, texturaBanda, texturaCartel, texturaDegradadoVertical } from './texturas'

type V3 = [number, number, number]

// Materiales compartidos por toda la decoración (mismo programa de shader → sin tirones al cambiar de sala).
const mats = {
  // Bancos y plantas: una sola malla con colores por vértice (1 draw call en vez de 5-8).
  coloresVertice: new MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }),
  coloresVerticePlano: new MeshStandardMaterial({ vertexColors: true, roughness: 0.8, flatShading: true }),
  piedra: new MeshStandardMaterial({ color: '#e8dfd1', roughness: 0.6 }),
  lacaRoja: new MeshStandardMaterial({ color: '#d8414f', roughness: 0.22, metalness: 0.1, emissive: '#5a0d18', emissiveIntensity: 0.5 }),
}

// Arquitectura fusionada por espacio: estructura (paredes, zócalos, molduras...), tiras LED y su brillo.
export const MAT_ARQUITECTURA = new MeshStandardMaterial({ vertexColors: true, roughness: 0.88 })
export const MAT_LED = new MeshBasicMaterial({ color: '#ffd9a8', toneMapped: false })
export const MAT_BRILLO = new MeshBasicMaterial({
  color: '#ffb969',
  map: texturaDegradadoVertical(),
  transparent: true,
  opacity: 0.55,
  blending: AdditiveBlending,
  depthWrite: false,
})
const COLOR_MOLDURA = '#f1e8db'

let geoBanco: BufferGeometry | null = null
let geoPlanta: BufferGeometry | null = null

const geometriaBanco = () =>
  (geoBanco ??= fusionar([
    { geometria: CAJA, matriz: trs([0, 0.44, 0], [2.3, 0.09, 0.56]), color: '#b7834f' },
    ...[-0.85, 0.85].flatMap((x): Pieza[] => [
      { geometria: CAJA, matriz: trs([x, 0.2, 0], [0.06, 0.4, 0.5]), color: '#2a2522' },
      { geometria: CAJA, matriz: trs([x, 0.02, 0], [0.1, 0.04, 0.52]), color: '#2a2522' },
    ]),
  ]))

const geometriaPlanta = () =>
  (geoPlanta ??= fusionar([
    { geometria: CILINDRO, matriz: trs([0, 0.28, 0], [0.27, 0.56, 0.27]), color: '#b5643f' },
    { geometria: CILINDRO, matriz: trs([0, 0.55, 0], [0.3, 0.06, 0.3]), color: '#b5643f' },
    { geometria: CILINDRO, matriz: trs([0, 0.585, 0], [0.25, 0.01, 0.25]), color: '#3b2a1e' },
    { geometria: CILINDRO, matriz: trs([0, 0.85, 0], [0.025, 0.6, 0.025]), color: '#5a3a26' },
    { geometria: ICOSAEDRO, matriz: trs([0, 1.25, 0], [0.42, 0.48, 0.42]), color: '#4f7a45' },
    { geometria: ICOSAEDRO, matriz: trs([0.18, 1.02, 0.1], 0.3), color: '#3f6a3c' },
    { geometria: ICOSAEDRO, matriz: trs([-0.15, 1.5, -0.08], 0.27), color: '#6a9152' },
    { geometria: ICOSAEDRO, matriz: trs([-0.2, 1.05, -0.12], 0.24), color: '#3f6a3c' },
  ]))

/** Banco de museo: tablero de roble sobre patas de metal. */
export function Banco({ position, rotacionY = 0 }: { position: V3; rotacionY?: number }) {
  return <mesh geometry={geometriaBanco()} material={mats.coloresVertice} position={position} rotation-y={rotacionY} />
}

/** Planta en maceta, low-poly. */
export function Planta({ position, escala = 1 }: { position: V3; escala?: number }) {
  return <mesh geometry={geometriaPlanta()} material={mats.coloresVerticePlano} position={position} scale={escala} />
}

/** Alfombra plana sobre el suelo. */
export function Alfombra({ position, ancho, largo, colores }: { position: V3; ancho: number; largo: number; colores: [string, string, string] }) {
  const textura = useMemo(() => texturaAlfombra(colores), [colores])
  useEffect(() => () => textura.dispose(), [textura])
  return (
    <mesh geometry={PLANO} position={position} rotation-x={-Math.PI / 2} scale={[ancho, largo, 1]}>
      <meshStandardMaterial map={textura} roughness={0.95} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
    </mesh>
  )
}

/** Piezas de arquitectura de un espacio, separadas por material para fusionarlas. */
export interface PiezasArquitectura {
  estructura: Pieza[]
  led: Pieza[]
  brillo: Pieza[]
}

export const nuevasPiezas = (): PiezasArquitectura => ({ estructura: [], led: [], brillo: [] })

/** Une las piezas de un espacio en 3 geometrías (3 draw calls). */
export const fusionarArquitectura = (p: PiezasArquitectura) => ({
  estructura: fusionar(p.estructura),
  led: fusionar(p.led),
  brillo: fusionar(p.brillo, true),
})

/** Moldura alrededor de un hueco de puerta. `pared`: cara de la pared (z = 0), la moldura sobresale hacia +Z. */
export function piezasMarcoPuerta(p: PiezasArquitectura, pared: Matrix4, ancho: number, alto: number) {
  p.estructura.push(
    { geometria: CAJA, matriz: en(pared, trs([-ancho / 2 - 0.06, alto / 2, 0.02], [0.12, alto + 0.12, 0.05])), color: COLOR_MOLDURA },
    { geometria: CAJA, matriz: en(pared, trs([ancho / 2 + 0.06, alto / 2, 0.02], [0.12, alto + 0.12, 0.05])), color: COLOR_MOLDURA },
    { geometria: CAJA, matriz: en(pared, trs([0, alto + 0.06, 0.02], [ancho + 0.24, 0.12, 0.05])), color: COLOR_MOLDURA },
  )
}

/** Iluminación indirecta a lo largo de una pared: cornisa, tira LED cálida y su brillo hacia el techo. */
export function piezasTiraLed(p: PiezasArquitectura, pared: Matrix4, largo: number, altura: number, techo: number) {
  p.estructura.push({ geometria: CAJA, matriz: en(pared, trs([0, altura - 0.03, 0.06], [largo, 0.04, 0.12])), color: COLOR_MOLDURA })
  p.led.push({ geometria: CAJA, matriz: en(pared, trs([0, altura - 0.004, 0.1], [largo - 0.1, 0.012, 0.02])), color: '#ffffff' })
  p.brillo.push({ geometria: PLANO, matriz: en(pared, trs([0, (altura + techo) / 2, 0.006], [largo, techo - altura, 1])), color: '#ffffff' })
}

/** Dibuja la arquitectura fusionada de un espacio. */
export function Arquitectura({ geos }: { geos: ReturnType<typeof fusionarArquitectura> }) {
  return (
    <>
      <mesh geometry={geos.estructura} material={MAT_ARQUITECTURA} />
      <mesh geometry={geos.led} material={MAT_LED} />
      <mesh geometry={geos.brillo} material={MAT_BRILLO} renderOrder={1} />
    </>
  )
}

/** Placa de latón en la pared. */
export function Cartel({ position, rotacionY = 0, titulo, linea2 }: { position: V3; rotacionY?: number; titulo: string; linea2: string }) {
  const textura = useMemo(() => texturaCartel(titulo, linea2), [titulo, linea2])
  useEffect(() => () => textura.dispose(), [textura])
  return (
    <mesh geometry={PLANO} position={position} rotation-y={rotacionY} scale={[0.7, 0.3, 1]}>
      <meshStandardMaterial map={textura} roughness={0.35} metalness={0.6} />
    </mesh>
  )
}

function geometriaCorazon() {
  // Corazón clásico de 22 × 19 unidades (el de los ejemplos de three.js), luego centrado y escalado.
  const s = new Shape()
  s.moveTo(5, 5)
  s.bezierCurveTo(5, 5, 4, 0, 0, 0)
  s.bezierCurveTo(-6, 0, -6, 7, -6, 7)
  s.bezierCurveTo(-6, 11, -3, 15.4, 5, 19)
  s.bezierCurveTo(12, 15.4, 16, 11, 16, 7)
  s.bezierCurveTo(16, 7, 16, 0, 10, 0)
  s.bezierCurveTo(7, 0, 5, 5, 5, 5)
  const g = new ExtrudeGeometry(s, {
    depth: 3.5,
    bevelEnabled: true,
    bevelThickness: 1.6,
    bevelSize: 1.3,
    bevelSegments: 5,
    curveSegments: 28,
  })
  g.rotateZ(Math.PI) // la forma original sale con la punta hacia arriba
  g.center()
  g.scale(0.04, 0.04, 0.04)
  return g
}

/** Pedestal central del vestíbulo: columna de piedra, banda de latón con el título y un corazón que gira. */
export function Pedestal({ texto }: { texto: string }) {
  const corazon = useRef<Group>(null)
  const geo = useMemo(
    () => ({ corazon: geometriaCorazon(), banda: new CylinderGeometry(0.805, 0.805, 0.2, 64, 1, true) }),
    [],
  )
  const banda = useMemo(() => texturaBanda(texto), [texto])
  useEffect(() => () => banda.dispose(), [banda])
  useEffect(
    () => () => {
      geo.corazon.dispose()
      geo.banda.dispose()
    },
    [geo],
  )

  useFrame((state, dt) => {
    const c = corazon.current
    if (!c) return
    c.rotation.y += Math.min(dt, 0.05) * 0.6
    c.position.y = 1.72 + Math.sin(state.clock.elapsedTime * 1.4) * 0.04
  })

  return (
    <group>
      <mesh geometry={CILINDRO} material={mats.piedra} position={[0, 0.06, 0]} scale={[0.98, 0.12, 0.98]} />
      <mesh geometry={CILINDRO} material={mats.piedra} position={[0, 0.6, 0]} scale={[0.8, 1.0, 0.8]} />
      <mesh geometry={CILINDRO} material={mats.piedra} position={[0, 1.13, 0]} scale={[0.9, 0.07, 0.9]} />
      <mesh geometry={geo.banda} position={[0, 0.82, 0]}>
        <meshStandardMaterial map={banda} roughness={0.3} metalness={0.75} />
      </mesh>
      <group ref={corazon} position={[0, 1.72, 0]}>
        <mesh geometry={geo.corazon} material={mats.lacaRoja} />
      </group>
    </group>
  )
}
