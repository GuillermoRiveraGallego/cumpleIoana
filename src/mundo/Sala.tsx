import { useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo } from 'react'
import { AdditiveBlending, MeshBasicMaterial, MeshStandardMaterial } from 'three'
import { SALA, type Tema } from '../config'
import type { Foto, Sala as DatosSala } from '../galeria/datos'
import { caja, registrarCajas, transformarCaja, type Caja } from './colisiones'
import { Cuadro, type MaterialesCuadro } from './Cuadro'
import { Alfombra, Banco, Cartel, Planta, PuertaCerrada } from './Decoracion'
import { CAJA, PLANO } from './geometrias'
import {
  texturaClaraboya,
  texturaDegradadoVertical,
  texturaParquet,
  texturaTituloSala,
} from './texturas'

type V3 = [number, number, number]

interface Ranura {
  foto: Foto
  posicion: V3
  rotacionY: number
  ancho: number
  alto: number
}

/**
 * Reparte las fotos por las paredes izquierda, fondo y derecha (la de la puerta queda libre),
 * en orden de visita: izquierda (de la entrada al fondo) → fondo → derecha (del fondo a la entrada).
 * Funciona con cualquier número de fotos; el tamaño de cada cuadro se adapta a su proporción.
 */
function distribuirCuadros(fotos: Foto[]): Ranura[] {
  const n = fotos.length
  const { ancho: W, fondo: D, margenEsquina: m, alturaCuadros: y } = SALA
  const largoLado = D - 2 * m
  const largoFondo = W - 2 * m
  let enFondo = Math.round((n * largoFondo) / (2 * largoLado + largoFondo))
  let enLados = n - enFondo
  if (enLados % 2 === 1) {
    enFondo++
    enLados--
  }
  const porLado = enLados / 2

  const huecos: { posicion: V3; rotacionY: number; anchoMax: number }[] = []
  const repartir = (k: number, largo: number, f: (t: number) => { posicion: V3; rotacionY: number }) => {
    for (let i = 0; i < k; i++) {
      const t = -largo / 2 + (largo * (i + 0.5)) / k
      huecos.push({ ...f(t), anchoMax: Math.min(SALA.anchoMaxCuadro, (largo / k) * 0.66) })
    }
  }
  repartir(porLado, largoLado, (t) => ({ posicion: [-W / 2, y, -t], rotacionY: Math.PI / 2 }))
  repartir(enFondo, largoFondo, (t) => ({ posicion: [t, y, -D / 2], rotacionY: 0 }))
  repartir(porLado, largoLado, (t) => ({ posicion: [W / 2, y, t], rotacionY: -Math.PI / 2 }))

  return fotos.map((foto, i) => {
    const h = huecos[i]
    const ancho = Math.min(h.anchoMax, SALA.altoMaxCuadro * foto.aspecto)
    return { foto, posicion: h.posicion, rotacionY: h.rotacionY, ancho, alto: ancho / foto.aspecto }
  })
}

interface Props {
  sala: DatosSala
  tema: Tema
  /** Posición y giro (en cuartos de vuelta) de la sala dentro del museo. */
  posicion?: V3
  giro?: number
}

/**
 * Una sala del museo (coordenadas locales: puerta en +Z, fondo en −Z).
 * Paredes, suelo, techo con claraboya, tira LED, cuadros, banco, plantas y colisiones.
 */
export function Sala({ sala, tema, posicion = [0, 0, 0], giro = 0 }: Props) {
  const { ancho: W, fondo: D, alto: H, grosor: T, puerta: P, altoPuerta: HP } = SALA
  const gl = useThree((s) => s.gl)
  const tramoFrente = (W - P) / 2 + T
  const xTramo = P / 2 + tramoFrente / 2

  // ── Colisiones ──
  const [ox, oy, oz] = posicion
  useLayoutEffect(() => {
    const locales: Caja[] = [
      caja(0, H / 2, -D / 2 - T / 2, W + 2 * T, H, T), // fondo
      caja(-W / 2 - T / 2, H / 2, 0, T, H, D + 2 * T), // izquierda
      caja(W / 2 + T / 2, H / 2, 0, T, H, D + 2 * T), // derecha
      caja(-xTramo, H / 2, D / 2 + T / 2, tramoFrente, H, T), // frente izq.
      caja(xTramo, H / 2, D / 2 + T / 2, tramoFrente, H, T), // frente der.
      caja(0, (HP + H) / 2, D / 2 + T / 2, P, H - HP, T), // dintel
      caja(0, HP / 2, D / 2 + T / 2, P, HP, T), // puerta cerrada (prototipo)
      caja(0, -0.25, 0, W + 2 * T, 0.5, D + 2 * T, { jugador: false }), // suelo (solo cámara)
      caja(0, H + 0.25, 0, W + 2 * T, 0.5, D + 2 * T, { jugador: false }), // techo (solo cámara)
      caja(0, 0.25, -0.6, 2.4, 0.5, 0.66, { camara: false }), // banco
      ...ESQUINAS.map(([sx, sz]) =>
        caja(sx * (W / 2 - 0.65), 0.6, sz * (D / 2 - 0.65), 0.8, 1.2, 0.8, { camara: false }),
      ),
    ]
    return registrarCajas(locales.map((c) => transformarCaja(c, [ox, oy, oz], giro)))
  }, [W, D, H, T, P, HP, tramoFrente, xTramo, ox, oy, oz, giro])

  // ── Materiales y texturas ──
  const parquet = useMemo(() => {
    const t = texturaParquet()
    t.repeat.set(W / 2.4, D / 2.4)
    t.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
    return t
  }, [W, D, gl])
  const claraboya = useMemo(() => texturaClaraboya(), [])
  const titulo = useMemo(() => texturaTituloSala(sala.titulo, sala.subtitulo, tema.titulo), [sala.titulo, sala.subtitulo, tema.titulo])
  useEffect(() => () => parquet.dispose(), [parquet])
  useEffect(() => () => claraboya.dispose(), [claraboya])
  useEffect(() => () => titulo.dispose(), [titulo])

  const mat = useMemo(
    () => ({
      pared: new MeshStandardMaterial({ color: tema.pared, roughness: 0.93 }),
      zocalo: new MeshStandardMaterial({ color: tema.zocalo, roughness: 0.6 }),
      // El techo mira hacia abajo y solo recibiría el rebote marrón del suelo: algo de emisión lo mantiene crema.
      techo: new MeshStandardMaterial({ color: '#f3ece2', roughness: 1, emissive: '#e6d6c1', emissiveIntensity: 0.55 }),
      marcoClaraboya: new MeshStandardMaterial({ color: '#d8ccbd', roughness: 0.8, emissive: '#d8ccbd', emissiveIntensity: 0.4 }),
      led: new MeshBasicMaterial({ color: '#ffd9a8', toneMapped: false }),
      brilloLed: new MeshBasicMaterial({
        color: '#ffb969',
        map: texturaDegradadoVertical(),
        transparent: true,
        opacity: 0.55,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    }),
    [tema.pared, tema.zocalo],
  )
  const matCuadros = useMemo<MaterialesCuadro>(
    () => ({
      marco: new MeshStandardMaterial({ color: tema.marco, roughness: 0.45, metalness: 0.1 }),
      paspartu: new MeshStandardMaterial({ color: '#f7f2ea', roughness: 0.95 }),
      metal: new MeshStandardMaterial({ color: '#262220', roughness: 0.4, metalness: 0.7 }),
      luzFoco: new MeshBasicMaterial({ color: '#fff0d6', toneMapped: false }),
    }),
    [tema.marco],
  )
  useEffect(() => () => Object.values(mat).forEach((m) => m.dispose()), [mat])
  useEffect(() => () => Object.values(matCuadros).forEach((m) => m.dispose()), [matCuadros])

  const ranuras = useMemo(() => distribuirCuadros(sala.fotos), [sala.fotos])

  const alturaLed = H - 0.32
  const paredes: { posicion: V3; escala: V3 }[] = [
    { posicion: [0, H / 2, -D / 2 - T / 2], escala: [W + 2 * T, H, T] },
    { posicion: [-W / 2 - T / 2, H / 2, 0], escala: [T, H, D + 2 * T] },
    { posicion: [W / 2 + T / 2, H / 2, 0], escala: [T, H, D + 2 * T] },
    { posicion: [-xTramo, H / 2, D / 2 + T / 2], escala: [tramoFrente, H, T] },
    { posicion: [xTramo, H / 2, D / 2 + T / 2], escala: [tramoFrente, H, T] },
    { posicion: [0, (HP + H) / 2, D / 2 + T / 2], escala: [P, H - HP, T] },
  ]
  // Tira LED + brillo en las tres paredes con cuadros (posición, giro, largo).
  const tiras: { posicion: V3; rotacionY: number; largo: number }[] = [
    { posicion: [0, 0, -D / 2], rotacionY: 0, largo: W },
    { posicion: [-W / 2, 0, 0], rotacionY: Math.PI / 2, largo: D },
    { posicion: [W / 2, 0, 0], rotacionY: -Math.PI / 2, largo: D },
  ]

  return (
    <group position={posicion} rotation-y={(giro * Math.PI) / 2}>
      {/* Suelo */}
      <mesh geometry={PLANO} rotation-x={-Math.PI / 2} scale={[W, D, 1]}>
        <meshStandardMaterial map={parquet} roughness={0.5} metalness={0} />
      </mesh>

      {/* Techo y claraboya */}
      <mesh geometry={PLANO} material={mat.techo} position={[0, H, 0]} rotation-x={Math.PI / 2} scale={[W, D, 1]} />
      <mesh geometry={PLANO} material={mat.marcoClaraboya} position={[0, H - 0.004, -0.6]} rotation-x={Math.PI / 2} scale={[3.5, 5.4, 1]} />
      <mesh geometry={PLANO} position={[0, H - 0.008, -0.6]} rotation-x={Math.PI / 2} scale={[3.2, 5.0, 1]}>
        <meshBasicMaterial map={claraboya} toneMapped={false} />
      </mesh>

      {/* Paredes */}
      {paredes.map((p, i) => (
        <mesh key={i} geometry={CAJA} material={mat.pared} position={p.posicion} scale={p.escala} />
      ))}

      {/* Zócalos */}
      <mesh geometry={CAJA} material={mat.zocalo} position={[0, 0.07, -D / 2 + 0.012]} scale={[W, 0.14, 0.024]} />
      <mesh geometry={CAJA} material={mat.zocalo} position={[-W / 2 + 0.012, 0.07, 0]} scale={[0.024, 0.14, D]} />
      <mesh geometry={CAJA} material={mat.zocalo} position={[W / 2 - 0.012, 0.07, 0]} scale={[0.024, 0.14, D]} />
      <mesh geometry={CAJA} material={mat.zocalo} position={[-xTramo, 0.07, D / 2 - 0.012]} scale={[tramoFrente, 0.14, 0.024]} />
      <mesh geometry={CAJA} material={mat.zocalo} position={[xTramo, 0.07, D / 2 - 0.012]} scale={[tramoFrente, 0.14, 0.024]} />

      {/* Iluminación indirecta: tira LED cálida y su brillo hacia el techo */}
      {tiras.map((t, i) => (
        <group key={i} position={t.posicion} rotation-y={t.rotacionY}>
          <mesh geometry={CAJA} material={mat.zocalo} position={[0, alturaLed - 0.03, 0.06]} scale={[t.largo, 0.04, 0.12]} />
          <mesh geometry={CAJA} material={mat.led} position={[0, alturaLed - 0.004, 0.1]} scale={[t.largo - 0.1, 0.012, 0.02]} />
          <mesh geometry={PLANO} material={mat.brilloLed} position={[0, (alturaLed + H) / 2, 0.006]} scale={[t.largo, H - alturaLed, 1]} />
        </group>
      ))}

      {/* Rótulo de la sala sobre la pared del fondo */}
      <mesh geometry={PLANO} position={[0, 3.32, -D / 2 + 0.01]} scale={[4.4, 1.2, 1]}>
        <meshBasicMaterial map={titulo} transparent depthWrite={false} />
      </mesh>

      {ranuras.map((r) => (
        <Cuadro
          key={r.foto.id}
          foto={r.foto}
          salaId={sala.id}
          anio={sala.anio}
          tema={tema}
          posicion={r.posicion}
          rotacionY={r.rotacionY}
          ancho={r.ancho}
          alto={r.alto}
          materiales={matCuadros}
        />
      ))}

      <Alfombra position={[0, 0.004, -0.6]} ancho={3.2} largo={5.4} colores={tema.alfombra} />
      <Banco position={[0, 0, -0.6]} />
      {ESQUINAS.map(([sx, sz]) => (
        <Planta key={`${sx}${sz}`} position={[sx * (W / 2 - 0.65), 0, sz * (D / 2 - 0.65)]} escala={sz > 0 ? 0.85 : 1.05} />
      ))}

      <PuertaCerrada position={[0, 0, D / 2]} ancho={P} alto={HP} grosorMuro={T} />
      <Cartel position={[P / 2 + 0.85, 1.55, D / 2 - 0.01]} rotacionY={Math.PI} titulo="Vestíbulo" linea2="Próximamente" />
    </group>
  )
}

const ESQUINAS: [number, number][] = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
]
