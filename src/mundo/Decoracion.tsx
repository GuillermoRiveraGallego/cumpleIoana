import { useEffect, useMemo } from 'react'
import { MeshStandardMaterial } from 'three'
import { CAJA, CILINDRO, ICOSAEDRO, PLANO } from './geometrias'
import { texturaAlfombra, texturaCartel } from './texturas'

type V3 = [number, number, number]

// Materiales compartidos por toda la decoración.
const mats = {
  roble: new MeshStandardMaterial({ color: '#b7834f', roughness: 0.55 }),
  nogal: new MeshStandardMaterial({ color: '#5a3a26', roughness: 0.5 }),
  metalOscuro: new MeshStandardMaterial({ color: '#2a2522', roughness: 0.45, metalness: 0.6 }),
  laton: new MeshStandardMaterial({ color: '#d1a861', roughness: 0.3, metalness: 1 }),
  terracota: new MeshStandardMaterial({ color: '#b5643f', roughness: 0.85 }),
  tierra: new MeshStandardMaterial({ color: '#3b2a1e', roughness: 1 }),
  hoja1: new MeshStandardMaterial({ color: '#4f7a45', roughness: 0.8, flatShading: true }),
  hoja2: new MeshStandardMaterial({ color: '#3f6a3c', roughness: 0.8, flatShading: true }),
  hoja3: new MeshStandardMaterial({ color: '#6a9152', roughness: 0.8, flatShading: true }),
  moldura: new MeshStandardMaterial({ color: '#f1e8db', roughness: 0.7 }),
}

/** Banco de museo: tablero de roble sobre patas de metal. */
export function Banco({ position, rotacionY = 0 }: { position: V3; rotacionY?: number }) {
  return (
    <group position={position} rotation-y={rotacionY}>
      <mesh geometry={CAJA} material={mats.roble} position={[0, 0.44, 0]} scale={[2.3, 0.09, 0.56]} />
      {[-0.85, 0.85].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh geometry={CAJA} material={mats.metalOscuro} position={[0, 0.2, 0]} scale={[0.06, 0.4, 0.5]} />
          <mesh geometry={CAJA} material={mats.metalOscuro} position={[0, 0.02, 0]} scale={[0.1, 0.04, 0.52]} />
        </group>
      ))}
    </group>
  )
}

/** Planta en maceta, low-poly. */
export function Planta({ position, escala = 1 }: { position: V3; escala?: number }) {
  return (
    <group position={position} scale={escala}>
      <mesh geometry={CILINDRO} material={mats.terracota} position={[0, 0.28, 0]} scale={[0.27, 0.56, 0.27]} />
      <mesh geometry={CILINDRO} material={mats.terracota} position={[0, 0.55, 0]} scale={[0.3, 0.06, 0.3]} />
      <mesh geometry={CILINDRO} material={mats.tierra} position={[0, 0.585, 0]} scale={[0.25, 0.01, 0.25]} />
      <mesh geometry={CILINDRO} material={mats.nogal} position={[0, 0.85, 0]} scale={[0.025, 0.6, 0.025]} />
      <mesh geometry={ICOSAEDRO} material={mats.hoja1} position={[0, 1.25, 0]} scale={[0.42, 0.48, 0.42]} />
      <mesh geometry={ICOSAEDRO} material={mats.hoja2} position={[0.18, 1.02, 0.1]} scale={0.3} />
      <mesh geometry={ICOSAEDRO} material={mats.hoja3} position={[-0.15, 1.5, -0.08]} scale={0.27} />
      <mesh geometry={ICOSAEDRO} material={mats.hoja2} position={[-0.2, 1.05, -0.12]} scale={0.24} />
    </group>
  )
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

/**
 * Puerta doble cerrada en el hueco de entrada (prototipo). En la fase 2 se quitará para conectar
 * con el vestíbulo; el hueco ya existe en la pared.
 */
export function PuertaCerrada({ position, ancho, alto, grosorMuro }: { position: V3; ancho: number; alto: number; grosorMuro: number }) {
  const hoja = ancho / 2 - 0.02
  return (
    <group position={position}>
      {[-1, 1].map((lado) => (
        <group key={lado} position={[(lado * ancho) / 4, 0, grosorMuro / 2]}>
          <mesh geometry={CAJA} material={mats.nogal} position={[0, alto / 2, 0]} scale={[hoja, alto, 0.08]} />
          {/* Cuarterones en relieve */}
          <mesh geometry={CAJA} material={mats.nogal} position={[0, alto * 0.7, -0.05]} scale={[hoja * 0.7, alto * 0.42, 0.03]} />
          <mesh geometry={CAJA} material={mats.nogal} position={[0, alto * 0.25, -0.05]} scale={[hoja * 0.7, alto * 0.3, 0.03]} />
          <mesh
            geometry={CILINDRO}
            material={mats.laton}
            position={[-lado * (hoja / 2 - 0.12), alto * 0.48, -0.08]}
            scale={[0.018, 0.34, 0.018]}
          />
        </group>
      ))}
      {/* Moldura (lado interior) */}
      <mesh geometry={CAJA} material={mats.moldura} position={[-ancho / 2 - 0.06, alto / 2, -0.02]} scale={[0.12, alto + 0.12, 0.05]} />
      <mesh geometry={CAJA} material={mats.moldura} position={[ancho / 2 + 0.06, alto / 2, -0.02]} scale={[0.12, alto + 0.12, 0.05]} />
      <mesh geometry={CAJA} material={mats.moldura} position={[0, alto + 0.06, -0.02]} scale={[ancho + 0.24, 0.12, 0.05]} />
    </group>
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
