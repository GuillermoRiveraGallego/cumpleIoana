import { useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { MeshBasicMaterial, MeshStandardMaterial, type Group } from 'three'
import { SALA } from '../config'
import { caja, registrarCajas, transformarCaja, type Caja } from './colisiones'
import { Cuadro } from './Cuadro'
import {
  Alfombra,
  Arquitectura,
  Banco,
  Cartel,
  fusionarArquitectura,
  nuevasPiezas,
  piezasMarcoPuerta,
  piezasTiraLed,
  Planta,
} from './Decoracion'
import type { EspacioSala, V3 } from './disposicion'
import { registrarEspacio } from './espacios'
import { CAJA, marcoEn, PLANO, trs } from './geometrias'
import { texturaClaraboya, texturaParquet, texturaTituloSala } from './texturas'

const ESQUINAS: [number, number][] = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
]

/**
 * Una sala del museo (coordenadas locales: puerta en +Z hacia el vestíbulo, fondo en −Z).
 * Su largo (`fondo`) depende del número de fotos; la colocación de cada cuadro viene calculada en `espacio`.
 */
export function Sala({ espacio }: { espacio: EspacioSala }) {
  const { sala, tema, fondo: D, posicion, giro, ranuras, bancos } = espacio
  const { ancho: W, alto: H, grosor: T, puerta: P, altoPuerta: HP } = SALA
  const gl = useThree((s) => s.gl)
  const grupo = useRef<Group>(null)
  const tramoFrente = (W - P) / 2 + T
  const xTramo = P / 2 + tramoFrente / 2

  // Las fotos no se descargan hasta que la sala se ve por primera vez.
  const [cargar, setCargar] = useState(false)
  useLayoutEffect(
    () =>
      registrarEspacio({
        id: sala.id,
        grupo: grupo.current!,
        limites: espacio.limites,
        portal: espacio.portal,
        alMostrar: () => setCargar(true),
      }),
    [sala.id, espacio.limites, espacio.portal],
  )

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
      ...bancos.map((z) => caja(0, 0.25, z, 2.4, 0.5, 0.66, { camara: false })),
      ...ESQUINAS.map(([sx, sz]) =>
        caja(sx * (W / 2 - 0.65), 0.6, sz * (D / 2 - 0.65), 0.8, 1.2, 0.8, { camara: false }),
      ),
    ]
    return registrarCajas(locales.map((c) => transformarCaja(c, [ox, oy, oz], giro)))
  }, [W, D, H, T, P, HP, tramoFrente, xTramo, ox, oy, oz, giro, bancos])

  // ── Materiales y texturas ──
  const parquet = useMemo(() => {
    const t = texturaParquet()
    t.repeat.set(W / 2.4, (D + T) / 2.4)
    t.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
    return t
  }, [W, D, T, gl])
  const claraboya = useMemo(() => texturaClaraboya(2, 3), [])
  const titulo = useMemo(
    () => texturaTituloSala(sala.titulo, sala.subtitulo, tema.titulo),
    [sala.titulo, sala.subtitulo, tema.titulo],
  )
  useEffect(() => () => parquet.dispose(), [parquet])
  useEffect(() => () => claraboya.dispose(), [claraboya])
  useEffect(() => () => titulo.dispose(), [titulo])

  const mat = useMemo(
    () => ({
      // El techo mira hacia abajo y solo recibiría el rebote marrón del suelo: algo de emisión lo mantiene crema.
      techo: new MeshStandardMaterial({ color: '#f3ece2', roughness: 1, emissive: '#e6d6c1', emissiveIntensity: 0.55 }),
      marcoClaraboya: new MeshStandardMaterial({ color: '#d8ccbd', roughness: 0.8, emissive: '#d8ccbd', emissiveIntensity: 0.4 }),
      claraboya: new MeshBasicMaterial({ map: claraboya, toneMapped: false }),
      umbral: new MeshStandardMaterial({ color: '#d9cbb8', roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -1 }),
    }),
    [claraboya],
  )
  useEffect(() => () => Object.values(mat).forEach((m) => m.dispose()), [mat])

  // Paredes, zócalos, cornisas, tiras LED y moldura de la puerta: fusionadas en 3 mallas (3 draw calls).
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
      tema.pared,
    )
    cajas(
      [
        [[0, 0.07, -D / 2 + 0.012], [W, 0.14, 0.024]],
        [[-W / 2 + 0.012, 0.07, 0], [0.024, 0.14, D]],
        [[W / 2 - 0.012, 0.07, 0], [0.024, 0.14, D]],
        [[-xTramo, 0.07, D / 2 - 0.012], [tramoFrente, 0.14, 0.024]],
        [[xTramo, 0.07, D / 2 - 0.012], [tramoFrente, 0.14, 0.024]],
      ],
      tema.zocalo,
    )
    // Tira LED en las tres paredes con cuadros.
    piezasTiraLed(p, marcoEn([0, 0, -D / 2], 0), W, H - 0.32, H)
    piezasTiraLed(p, marcoEn([-W / 2, 0, 0], Math.PI / 2), D, H - 0.32, H)
    piezasTiraLed(p, marcoEn([W / 2, 0, 0], -Math.PI / 2), D, H - 0.32, H)
    // Moldura de la puerta, por dentro de la sala.
    piezasMarcoPuerta(p, marcoEn([0, 0, D / 2], Math.PI), P, HP)
    return fusionarArquitectura(p)
  }, [W, D, H, T, P, HP, tramoFrente, xTramo, tema.pared, tema.zocalo])
  useEffect(() => () => Object.values(arquitectura).forEach((g) => g.dispose()), [arquitectura])

  const largoClaraboya = Math.min(5, D / bancos.length - 2.5)

  return (
    <group ref={grupo} position={posicion} rotation-y={(giro * Math.PI) / 2}>
      {/* Suelo (incluye media puerta, que conecta con el suelo del vestíbulo) */}
      <mesh geometry={PLANO} rotation-x={-Math.PI / 2} position={[0, 0, T / 2]} scale={[W, D + T, 1]}>
        <meshStandardMaterial map={parquet} roughness={0.5} metalness={0} />
      </mesh>
      {/* Umbral de piedra en el paso de la puerta */}
      <mesh geometry={PLANO} material={mat.umbral} rotation-x={-Math.PI / 2} position={[0, 0.003, D / 2 + T]} scale={[P, 2 * T, 1]} />

      {/* Techo y claraboyas (una sobre cada banco) */}
      <mesh geometry={PLANO} material={mat.techo} position={[0, H, 0]} rotation-x={Math.PI / 2} scale={[W, D, 1]} />
      {bancos.map((z) => (
        <group key={z} position={[0, H, z]}>
          <mesh geometry={PLANO} material={mat.marcoClaraboya} position={[0, -0.004, 0]} rotation-x={Math.PI / 2} scale={[3.5, largoClaraboya + 0.4, 1]} />
          <mesh geometry={PLANO} material={mat.claraboya} position={[0, -0.008, 0]} rotation-x={Math.PI / 2} scale={[3.2, largoClaraboya, 1]} />
        </group>
      ))}

      <Arquitectura geos={arquitectura} />

      {/* Rótulo de la sala sobre la pared del fondo */}
      <mesh geometry={PLANO} position={[0, 3.32, -D / 2 + 0.01]} scale={[4.4, 1.2, 1]}>
        <meshBasicMaterial map={titulo} transparent depthWrite={false} />
      </mesh>

      {ranuras.map((r) => (
        <Cuadro
          key={r.foto.id}
          foto={r.foto}
          salaId={sala.id}
          orden={sala.orden}
          etiqueta={sala.titulo}
          tema={tema}
          posicion={r.posicion}
          rotacionY={r.rotacionY}
          ancho={r.ancho}
          alto={r.alto}
          cargar={cargar}
        />
      ))}

      {bancos.map((z) => (
        <group key={z} position={[0, 0, z]}>
          <Alfombra position={[0, 0.004, 0]} ancho={3.2} largo={5.4} colores={tema.alfombra} />
          <Banco position={[0, 0, 0]} />
        </group>
      ))}
      {ESQUINAS.map(([sx, sz]) => (
        <Planta key={`${sx}${sz}`} position={[sx * (W / 2 - 0.65), 0, sz * (D / 2 - 0.65)]} escala={sz > 0 ? 0.85 : 1.05} />
      ))}

      <Cartel position={[P / 2 + 0.95, 1.55, D / 2 - 0.01]} rotacionY={Math.PI} titulo="Vestíbulo" linea2="Salida" />
    </group>
  )
}
