import { useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { MeshStandardMaterial, type Group } from 'three'
import { CUMPLE, SALA } from '../../config'
import { caja, registrarCajas, transformarCaja, type Caja } from '../colisiones'
import {
  Alfombra,
  Arquitectura,
  Cartel,
  fusionarArquitectura,
  nuevasPiezas,
  piezasMarcoPuerta,
  piezasTiraLed,
  Planta,
} from '../Decoracion'
import type { EspacioFiesta, V3 } from '../disposicion'
import { ID_FIESTA, registrarEspacio } from '../espacios'
import { CAJA, marcoEn, PLANO, trs } from '../geometrias'
import { texturaParquet, texturaTituloSala } from '../texturas'
import { Adornos } from './Adornos'
import { Confeti } from './Confeti'
import { ALTURA_TARTA, Tarta } from './Tarta'

const COLOR_PARED = '#b65b7f'
const COLOR_ZOCALO = '#f6e9df'
const COLOR_TITULO = '#fff3e4'
/** La mesa con la tarta, un poco hacia el fondo para que se vea entera al entrar. */
const Z_MESA = -0.8
const ALFOMBRA: [string, string, string] = ['#f1dfb2', '#c25b7a', '#7a2f4a']

/**
 * Sala del cumpleaños (coordenadas locales: puerta en +Z hacia el vestíbulo, fondo en −Z), tras la puerta
 * principal, que está abierta de par en par. Mesa con la tarta en el centro, rótulo de «¡Feliz cumpleaños!»
 * en el fondo, banderines, bombillas y globos, y el confeti que cae al apagar las velas.
 */
export function SalaFiesta({ espacio }: { espacio: EspacioFiesta }) {
  const { posicion, giro, ancho: W, fondo: D, limites, portal } = espacio
  const { alto: H, grosor: T, puerta: P, altoPuerta: HP } = SALA
  const gl = useThree((s) => s.gl)
  const grupo = useRef<Group>(null)
  const tramoFrente = (W - P) / 2 + T
  const xTramo = P / 2 + tramoFrente / 2
  // Las dos hojas de la puerta principal, abiertas 90° hacia dentro: bisagra en la cara del vestíbulo.
  const zBisagra = D / 2 + 2 * T - 0.02
  const largoHoja = P / 2 - 0.02

  useLayoutEffect(() => registrarEspacio({ id: ID_FIESTA, grupo: grupo.current!, limites, portal }), [limites, portal])

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
      caja(0, -0.25, T / 2, W + 2 * T, 0.5, D + 3 * T, { jugador: false }), // suelo (solo cámara)
      caja(0, H + 0.25, 0, W + 2 * T, 0.5, D + 2 * T, { jugador: false }), // techo (solo cámara)
      // Hojas de la puerta y plantas de las esquinas de la entrada
      ...[-1, 1].map((s) => caja(s * (P / 2 - 0.03), HP / 2, zBisagra - largoHoja / 2, 0.06, HP, largoHoja, { camara: false })),
      ...[-1, 1].map((s) => caja(s * (W / 2 - 0.65), 0.6, D / 2 - 0.65, 0.8, 1.2, 0.8, { camara: false })),
    ]
    return registrarCajas(locales.map((c) => transformarCaja(c, [ox, oy, oz], giro)))
  }, [W, D, H, T, P, HP, tramoFrente, xTramo, zBisagra, largoHoja, ox, oy, oz, giro])

  // ── Materiales y texturas ──
  const parquet = useMemo(() => {
    const t = texturaParquet()
    t.repeat.set(W / 2.4, (D + T) / 2.4)
    t.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
    return t
  }, [W, D, T, gl])
  const titulo = useMemo(() => texturaTituloSala(CUMPLE.titulo, CUMPLE.subtitulo, COLOR_TITULO), [])
  useEffect(() => () => parquet.dispose(), [parquet])
  useEffect(() => () => titulo.dispose(), [titulo])
  const mat = useMemo(
    () => ({
      techo: new MeshStandardMaterial({ color: '#f6ece6', roughness: 1, emissive: '#ead2cc', emissiveIntensity: 0.55 }),
      umbral: new MeshStandardMaterial({ color: '#d9cbb8', roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -1 }),
    }),
    [],
  )
  useEffect(() => () => Object.values(mat).forEach((m) => m.dispose()), [mat])

  // Paredes, zócalos, tiras LED, moldura y hojas de la puerta: fusionadas en 3 mallas.
  const arquitectura = useMemo(() => {
    const p = nuevasPiezas()
    const cajas = (lista: [V3, V3][], color: string) =>
      lista.forEach(([pos, esc]) => p.estructura.push({ geometria: CAJA, matriz: trs(pos, esc), color }))
    cajas(
      [
        [[0, H / 2, -D / 2 - T / 2], [W + 2 * T, H, T]],
        [[-W / 2 - T / 2, H / 2, 0], [T, H, D + 2 * T]],
        [[W / 2 + T / 2, H / 2, 0], [T, H, D + 2 * T]],
        [[-xTramo, H / 2, D / 2 + T / 2], [tramoFrente, H, T]],
        [[xTramo, H / 2, D / 2 + T / 2], [tramoFrente, H, T]],
        [[0, (HP + H) / 2, D / 2 + T / 2], [P, H - HP, T]],
      ],
      COLOR_PARED,
    )
    cajas(
      [
        [[0, 0.07, -D / 2 + 0.012], [W, 0.14, 0.024]],
        [[-W / 2 + 0.012, 0.07, 0], [0.024, 0.14, D]],
        [[W / 2 - 0.012, 0.07, 0], [0.024, 0.14, D]],
        [[-xTramo, 0.07, D / 2 - 0.012], [tramoFrente, 0.14, 0.024]],
        [[xTramo, 0.07, D / 2 - 0.012], [tramoFrente, 0.14, 0.024]],
      ],
      COLOR_ZOCALO,
    )
    piezasTiraLed(p, marcoEn([0, 0, -D / 2], 0), W, H - 0.32, H)
    piezasTiraLed(p, marcoEn([-W / 2, 0, 0], Math.PI / 2), D, H - 0.32, H)
    piezasTiraLed(p, marcoEn([W / 2, 0, 0], -Math.PI / 2), D, H - 0.32, H)
    piezasMarcoPuerta(p, marcoEn([0, 0, D / 2], Math.PI), P, HP)
    // Hojas de nogal con cuarterones y tirador de latón (la misma puerta que se ve cerrada sin esta sala).
    const zc = zBisagra - largoHoja / 2
    for (const s of [-1, 1]) {
      const x = s * (P / 2 - 0.03)
      const dentro = x - s * 0.035
      cajas(
        [
          [[x, HP / 2, zc], [0.06, HP, largoHoja]],
          [[dentro, HP * 0.7, zc], [0.02, HP * 0.42, largoHoja * 0.7]],
          [[dentro, HP * 0.25, zc], [0.02, HP * 0.3, largoHoja * 0.7]],
        ],
        '#5a3a26',
      )
      cajas([[[x - s * 0.065, HP * 0.48, zBisagra - largoHoja + 0.12], [0.035, 0.34, 0.035]]], '#d1a861')
    }
    return fusionarArquitectura(p)
  }, [W, D, H, T, P, HP, tramoFrente, xTramo, zBisagra, largoHoja])
  useEffect(() => () => Object.values(arquitectura).forEach((g) => g.dispose()), [arquitectura])

  const origenConfeti = useMemo<V3>(() => [0, ALTURA_TARTA, Z_MESA], [])
  const mesa = useMemo(() => ({ x: 0, z: Z_MESA, radio: 0.66, alto: 0.765 }), [])

  return (
    <group ref={grupo} position={posicion} rotation-y={(giro * Math.PI) / 2}>
      {/* Suelo (incluye media puerta, que conecta con el suelo del vestíbulo) y umbral */}
      <mesh geometry={PLANO} rotation-x={-Math.PI / 2} position={[0, 0, T / 2]} scale={[W, D + T, 1]}>
        <meshStandardMaterial map={parquet} roughness={0.5} metalness={0} />
      </mesh>
      <mesh geometry={PLANO} material={mat.umbral} rotation-x={-Math.PI / 2} position={[0, 0.003, D / 2 + T]} scale={[P, 2 * T, 1]} />
      <mesh geometry={PLANO} material={mat.techo} position={[0, H, 0]} rotation-x={Math.PI / 2} scale={[W, D, 1]} />

      <Arquitectura geos={arquitectura} />

      {/* «¡Feliz cumpleaños!» en la pared del fondo, detrás de la tarta */}
      <mesh geometry={PLANO} position={[0, 2.65, -D / 2 + 0.01]} scale={[5.6, (5.6 * 560) / 2048, 1]}>
        <meshBasicMaterial map={titulo} transparent depthWrite={false} />
      </mesh>

      <Alfombra position={[0, 0.004, Z_MESA]} ancho={3.4} largo={3.4} colores={ALFOMBRA} />
      <Tarta position={[0, 0, Z_MESA]} />
      <Adornos ancho={W} fondo={D} alto={H} />
      <Confeti origen={origenConfeti} mesa={mesa} ancho={W} fondo={D} alto={H} />

      {[-1, 1].map((s) => (
        <Planta key={s} position={[s * (W / 2 - 0.65), 0, D / 2 - 0.65]} escala={0.9} />
      ))}
      <Cartel position={[P / 2 + 0.95, 1.55, D / 2 - 0.01]} rotacionY={Math.PI} titulo="Vestíbulo" linea2="Salida" />
    </group>
  )
}
