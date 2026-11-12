import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
  type Group,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { aleatorio } from '../../util/matematicas'
import { registrarCilindros } from '../colisiones'
import { CILINDRO, fusionar, ICOSAEDRO, trs, type Pieza } from '../geometrias'
import { texturaDegradadoRadial } from '../texturas'
import { Sprites } from './sprites'

type V3 = [number, number, number]

const COLORES = ['#f2c14e', '#e36588', '#5bc0be', '#9b72cf', '#f78154', '#fff6ea', '#7bd389']
const COLORES_GLOBOS = ['#e36588', '#f2c14e', '#5bc0be', '#9b72cf', '#ff8fab', '#fff6ea', '#f78154', '#d9b45a']

// Geometrías propias de la fiesta (compartidas, nunca se liberan: son pocas y pequeñas).
const CUERDA = new CylinderGeometry(1, 1, 1, 4, 1, true)
const GLOBO = new SphereGeometry(1, 14, 10)
const EJE_Y = new Vector3(0, 1, 0)

const MAT_BANDERINES = new MeshStandardMaterial({ vertexColors: true, side: DoubleSide, roughness: 0.8 })
const MAT_BOMBILLAS = new MeshBasicMaterial({ vertexColors: true, toneMapped: false })
const MAT_GLOBOS = new MeshStandardMaterial({ vertexColors: true, roughness: 0.2, metalness: 0.05 })

/** Matriz de un cilindro unitario estirado entre dos puntos. */
function entre(a: V3, b: V3, radio: number) {
  const va = new Vector3(...a)
  const dir = new Vector3(...b).sub(va)
  const largo = dir.length()
  return new Matrix4().compose(
    va.addScaledVector(dir, 0.5),
    new Quaternion().setFromUnitVectors(EJE_Y, dir.normalize()),
    new Vector3(radio, largo, radio),
  )
}

/** Cuerda que cuelga entre dos puntos (parábola, como una catenaria). */
const curva = (a: V3, b: V3, caida: number) => (t: number): V3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t - caida * 4 * t * (1 - t),
  a[2] + (b[2] - a[2]) * t,
]

/** Piezas de una cuerda (tramos finos) a lo largo de una curva. */
function piezasCuerda(punto: (t: number) => V3, tramos: number, color: string): Pieza[] {
  return Array.from({ length: tramos }, (_, i) => ({
    geometria: CUERDA,
    matriz: entre(punto(i / tramos), punto((i + 1) / tramos), 0.006),
    color,
  }))
}

interface Linea {
  a: V3
  b: V3
  caida: number
}

/** Banderines triangulares de colores colgando de cuerdas: una sola geometría (1 llamada de dibujo). */
function geometriaBanderines(lineas: Linea[]) {
  const pos: number[] = []
  const col: number[] = []
  const c = new Color()
  const cuerdas: Pieza[] = []
  let k = 0
  for (const { a, b, caida } of lineas) {
    const punto = curva(a, b, caida)
    const num = Math.floor(Math.hypot(b[0] - a[0], b[2] - a[2]) / 0.34)
    for (let i = 0; i < num; i++) {
      const p0 = punto((i + 0.1) / num)
      const p1 = punto((i + 0.9) / num)
      const pm = punto((i + 0.5) / num)
      pos.push(...p0, ...p1, pm[0], pm[1] - 0.27, pm[2])
      c.set(COLORES[k++ % COLORES.length])
      for (let v = 0; v < 3; v++) col.push(c.r, c.g, c.b)
    }
    cuerdas.push(...piezasCuerda(punto, 24, '#efe6da'))
  }
  const triangulos = new BufferGeometry()
  triangulos.setAttribute('position', new Float32BufferAttribute(pos, 3))
  triangulos.setAttribute('color', new Float32BufferAttribute(col, 3))
  triangulos.computeVertexNormals()
  const cuerda = fusionar(cuerdas)
  const unida = mergeGeometries([triangulos, cuerda])!
  triangulos.dispose()
  cuerda.dispose()
  return unida
}

/** Guirnaldas de bombillas: cuerda + bombillas que brillan (y un halo por bombilla). */
function bombillas(lineas: Linea[]) {
  const puntos: V3[] = []
  const cuerdas: Pieza[] = []
  for (const { a, b, caida } of lineas) {
    const punto = curva(a, b, caida)
    const num = Math.floor(Math.hypot(b[0] - a[0], b[2] - a[2]) / 0.45)
    for (let i = 0; i < num; i++) {
      const [x, y, z] = punto((i + 0.5) / num)
      puntos.push([x, y - 0.05, z])
    }
    cuerdas.push(...piezasCuerda(punto, 24, '#3a2f28'))
  }
  const c = ['#ffe2a8', '#ffd0d8', '#fff3d6', '#cdeee8']
  const luces = fusionar(puntos.map((p, i) => ({ geometria: ICOSAEDRO, matriz: trs(p, [0.032, 0.042, 0.032]), color: c[i % c.length] })))
  return { cuerda: fusionar(cuerdas), luces, puntos }
}

/** Un globo con su nudo y el hilo hasta `ancla`. */
function piezasGlobo(p: V3, color: string, ancla: V3, escala = 1): Pieza[] {
  const fondo: V3 = [p[0], p[1] - 0.26 * escala, p[2]]
  return [
    { geometria: GLOBO, matriz: trs(p, [0.2 * escala, 0.25 * escala, 0.2 * escala]), color },
    { geometria: CILINDRO, matriz: trs([fondo[0], fondo[1] - 0.012, fondo[2]], [0.02, 0.03, 0.02]), color },
    { geometria: CUERDA, matriz: entre(fondo, ancla, 0.004), color: '#f4efe8' },
  ]
}

/** Racimo de globos atados a un peso en el suelo (coordenadas locales del racimo: el peso en el origen). */
function geometriaRacimo(semilla: number) {
  const r = aleatorio(semilla)
  const peso: V3 = [0, 0.09, 0]
  const piezas: Pieza[] = [
    { geometria: CILINDRO, matriz: trs([0, 0.045, 0], [0.09, 0.09, 0.09]), color: '#d9b45a' },
    { geometria: ICOSAEDRO, matriz: trs([0, 0.1, 0], 0.035), color: '#d9b45a' },
  ]
  const n = 6
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * 0.5
    const d = i === 0 ? 0 : 0.22 + r() * 0.12
    const p: V3 = [Math.cos(a) * d, i === 0 ? 2.65 : 1.95 + r() * 0.5, Math.sin(a) * d]
    piezas.push(...piezasGlobo(p, COLORES_GLOBOS[Math.floor(r() * COLORES_GLOBOS.length)], peso))
  }
  return fusionar(piezas)
}

/** Globos de helio pegados al techo, con el hilo colgando. */
function geometriaGlobosTecho(ancho: number, fondo: number, alto: number) {
  const r = aleatorio(17)
  const piezas: Pieza[] = []
  for (let i = 0; i < 14; i++) {
    const x = (r() - 0.5) * (ancho - 1.2)
    const z = (r() - 0.5) * (fondo - 1.2)
    const y = alto - 0.27
    const largo = 0.8 + r() * 0.7
    const ancla: V3 = [x + (r() - 0.5) * 0.3, y - 0.27 - largo, z + (r() - 0.5) * 0.3]
    piezas.push(...piezasGlobo([x, y, z], COLORES_GLOBOS[i % COLORES_GLOBOS.length], ancla))
  }
  return fusionar(piezas)
}

const COLOR_HALO = new Color('#ffcf87')

/**
 * Decoración de la sala del cumpleaños (coordenadas locales de la sala, puerta en +Z):
 * banderines y guirnaldas de bombillas de pared a pared, racimos de globos y globos en el techo.
 * Todo está fusionado: unas 8 llamadas de dibujo en total.
 */
export function Adornos({ ancho: W, fondo: D, alto: H }: { ancho: number; fondo: number; alto: number }) {
  const grupo = useRef<Group>(null)
  const racimos = useMemo<V3[]>(
    () => [
      [-W / 2 + 0.9, 0, -D / 2 + 0.9],
      [W / 2 - 0.9, 0, -D / 2 + 0.9],
      [-W / 2 + 0.75, 0, D / 2 - 2.2],
      [W / 2 - 0.75, 0, D / 2 - 2.2],
    ],
    [W, D],
  )

  const geo = useMemo(() => {
    const y = H - 0.5
    const banderines = geometriaBanderines(
      [-2.4, -0.2, 2.2].map((z) => ({ a: [-W / 2, y, z] as V3, b: [W / 2, y, z] as V3, caida: 0.6 })),
    )
    const luces = bombillas([-2.6, 2.6].map((x) => ({ a: [x, y + 0.08, -D / 2] as V3, b: [x, y + 0.08, D / 2] as V3, caida: 0.5 })))
    return {
      banderines,
      cuerdaLuces: luces.cuerda,
      luces: luces.luces,
      puntosLuces: luces.puntos,
      racimos: racimos.map((_, i) => geometriaRacimo(31 + i * 7)),
      techo: geometriaGlobosTecho(W, D, H),
    }
  }, [W, D, H, racimos])
  useEffect(
    () => () => {
      geo.banderines.dispose()
      geo.cuerdaLuces.dispose()
      geo.luces.dispose()
      geo.racimos.forEach((g) => g.dispose())
      geo.techo.dispose()
    },
    [geo],
  )

  // Halo de cada bombilla (estático).
  const halos = useMemo(() => {
    const s = new Sprites(geo.puntosLuces.length, texturaDegradadoRadial(), AdditiveBlending)
    geo.puntosLuces.forEach(([x, y, z], i) => s.poner(i, x, y, z, 0.26, 0.26, 0, COLOR_HALO, 0.3))
    s.actualizar(geo.puntosLuces.length)
    return s
  }, [geo])
  useEffect(() => () => halos.dispose(), [halos])

  // Los pesos de los racimos no se atraviesan (coordenadas del mundo).
  useLayoutEffect(() => {
    const g = grupo.current!
    g.updateWorldMatrix(true, false)
    return registrarCilindros(
      racimos.map((p) => {
        const v = g.localToWorld(new Vector3(...p))
        return { x: v.x, z: v.z, radio: 0.22 }
      }),
    )
  }, [racimos])

  // Los racimos se mecen un poco, cada uno a su ritmo.
  const refsRacimos = useRef<(Group | null)[]>([])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    refsRacimos.current.forEach((g, i) => {
      if (!g) return
      g.rotation.x = Math.sin(t * 0.7 + i * 1.9) * 0.025
      g.rotation.z = Math.cos(t * 0.55 + i * 1.3) * 0.025
    })
  })

  return (
    <group ref={grupo}>
      <mesh geometry={geo.banderines} material={MAT_BANDERINES} />
      <mesh geometry={geo.cuerdaLuces} material={MAT_BANDERINES} />
      <mesh geometry={geo.luces} material={MAT_BOMBILLAS} />
      <primitive object={halos.malla} />
      <mesh geometry={geo.techo} material={MAT_GLOBOS} />
      {racimos.map((p, i) => (
        <group key={i} position={p} ref={(g) => void (refsRacimos.current[i] = g)}>
          <mesh geometry={geo.racimos[i]} material={MAT_GLOBOS} />
        </group>
      ))}
    </group>
  )
}
