import { useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { MeshBasicMaterial, MeshStandardMaterial, type Group } from 'three'
import { SALA, TITULO_MUSEO, VESTIBULO } from '../config'
import { lemaMuseo, type Sala as DatosSala } from '../galeria/datos'
import { caja, registrarCajas, registrarCilindros, transformarCaja, type Caja } from './colisiones'
import {
  Arquitectura,
  Cartel,
  fusionarArquitectura,
  nuevasPiezas,
  Pedestal,
  piezasMarcoPuerta,
  piezasTiraLed,
  Planta,
} from './Decoracion'
import { tramosPared, type Disposicion, type ParedVestibulo, type V3 } from './disposicion'
import { ID_VESTIBULO, registrarEspacio } from './espacios'
import { CAJA, en, marcoEn, PLANO, trs } from './geometrias'
import { texturaClaraboya, texturaMarmol, texturaRoseton, texturaTituloSala } from './texturas'

const RADIO_PEDESTAL = 1.0
const ESQUINAS: [number, number][] = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
]
const COLOR_PARED = '#f6eee3'
const COLOR_FRISO = '#a97f5b'
const COLOR_MOLDURA = '#f1e8db'

/** Tramos de pared libres de puertas (para el friso), con `margen` a cada lado de cada puerta. */
function tramosLibres(largo: number, puertas: number[], margen: number): [number, number][] {
  const libres: [number, number][] = []
  let desde = -largo / 2
  for (const x of [...puertas].sort((a, b) => a - b)) {
    if (x - margen - desde > 0.2) libres.push([desde, x - margen])
    desde = x + margen
  }
  if (largo / 2 - desde > 0.2) libres.push([desde, largo / 2])
  return libres
}

/** Cartel con texto pintado en la pared (título + subtítulo). */
function Rotulo({ titulo, subtitulo, posicion, ancho }: { titulo: string; subtitulo: string; posicion: V3; ancho: number }) {
  const textura = useMemo(() => texturaTituloSala(titulo, subtitulo, '#4a3426'), [titulo, subtitulo])
  useEffect(() => () => textura.dispose(), [textura])
  return (
    <mesh geometry={PLANO} position={posicion} scale={[ancho, (ancho * 560) / 2048, 1]}>
      <meshBasicMaterial map={textura} transparent depthWrite={false} />
    </mesh>
  )
}

/** Carteles de una pared: sobre cada puerta el nombre de la sala y, al lado, cuántos recuerdos tiene. */
function CartelesPared({ pared }: { pared: ParedVestibulo }) {
  const { puerta: P, altoPuerta: HP } = SALA
  return (
    <group position={pared.origen} rotation-y={(pared.giro * Math.PI) / 2}>
      {pared.puertas.map(({ x, sala }) => (
        <group key={sala.id}>
          <Rotulo titulo={sala.titulo} subtitulo={sala.subtitulo} posicion={[x, HP + 0.68, 0.012]} ancho={3.6} />
          <Cartel position={[x + P / 2 + 0.95, 1.55, 0.012]} titulo={sala.titulo} linea2={textoRecuerdos(sala)} />
        </group>
      ))}
    </group>
  )
}

function textoRecuerdos(sala: DatosSala) {
  const n = sala.fotos.filter((f) => !f.provisional).length
  return n === 0 ? 'Próximamente' : `${n} ${n === 1 ? 'recuerdo' : 'recuerdos'}`
}

/**
 * Vestíbulo: galería con el suelo de mármol y un rosetón, una puerta por sala (con su cartel),
 * la puerta principal con el título del museo en la entrada, el corazón en el centro y plantas en las esquinas.
 * Su tamaño y sus puertas vienen de `disposicion` (crece con el número de salas).
 */
export function Vestibulo({ disposicion }: { disposicion: Disposicion }) {
  const { ancho: V, largo: L, paredes, limites } = disposicion.vestibulo
  const { alto: H } = VESTIBULO
  const { grosor: T, puerta: P, altoPuerta: HP } = SALA
  const gl = useThree((s) => s.gl)
  const grupo = useRef<Group>(null)
  const numSalas = disposicion.salas.length

  useLayoutEffect(() => registrarEspacio({ id: ID_VESTIBULO, grupo: grupo.current!, limites }), [limites])

  // ── Colisiones ──
  useLayoutEffect(() => {
    const cajas: Caja[] = paredes.flatMap((p) =>
      tramosPared(p.largo, H, p.puertas.map((d) => d.x), T).map(({ centro, tam }) =>
        transformarCaja(caja(...centro, ...tam), p.origen, p.giro),
      ),
    )
    cajas.push(
      caja(0, -0.25, 0, V + 2 * T, 0.5, L + 2 * T, { jugador: false }), // suelo (solo cámara)
      caja(0, H + 0.25, 0, V + 2 * T, 0.5, L + 2 * T, { jugador: false }), // techo (solo cámara)
      ...ESQUINAS.map(([sx, sz]) => caja(sx * (V / 2 - 0.8), 0.7, sz * (L / 2 - 0.8), 1.0, 1.4, 1.0, { camara: false })),
    )
    const quitarCajas = registrarCajas(cajas)
    const quitarCilindros = registrarCilindros([{ x: 0, z: 0, radio: RADIO_PEDESTAL }])
    return () => {
      quitarCajas()
      quitarCilindros()
    }
  }, [paredes, V, L, H, T])

  // ── Arquitectura fusionada: paredes, frisos, molduras, tiras LED y la puerta principal (3 draw calls) ──
  const arquitectura = useMemo(() => {
    const p = nuevasPiezas()
    const altoFriso = 1.1
    for (const pared of paredes) {
      const cara = marcoEn(pared.origen, (pared.giro * Math.PI) / 2)
      const pieza = (pos: V3, esc: V3, color: string) => p.estructura.push({ geometria: CAJA, matriz: en(cara, trs(pos, esc)), color })
      const puertas = pared.puertas.map((d) => d.x)
      for (const { centro, tam } of tramosPared(pared.largo, H, puertas, T)) pieza(centro, tam, COLOR_PARED)
      // La puerta principal (cerrada) va en el centro de la pared de la entrada.
      const huecosDecorados = pared.lado === 'sur' ? [0] : puertas
      for (const [a, b] of tramosLibres(pared.largo, huecosDecorados, P / 2 + 0.14)) {
        pieza([(a + b) / 2, altoFriso / 2, 0.015], [b - a, altoFriso, 0.03], COLOR_FRISO)
        pieza([(a + b) / 2, altoFriso + 0.025, 0.03], [b - a, 0.05, 0.06], COLOR_MOLDURA)
      }
      for (const x of huecosDecorados) piezasMarcoPuerta(p, en(cara, marcoEn([x, 0, 0])), P, HP)
      piezasTiraLed(p, cara, pared.largo, H - 0.32, H)
      if (pared.lado === 'sur') {
        // Puerta principal de doble hoja, de nogal, con cuarterones y tiradores de latón.
        for (const s of [-1, 1]) {
          const x = (s * P) / 4
          pieza([x, HP / 2, 0.03], [P / 2 - 0.02, HP, 0.06], '#5a3a26')
          pieza([x, HP * 0.7, 0.065], [(P / 2) * 0.7, HP * 0.42, 0.02], '#6b4730')
          pieza([x, HP * 0.25, 0.065], [(P / 2) * 0.7, HP * 0.3, 0.02], '#6b4730')
          pieza([x - s * (P / 4 - 0.12), HP * 0.48, 0.09], [0.035, 0.34, 0.035], '#d1a861')
        }
      }
    }
    return fusionarArquitectura(p)
  }, [paredes, H, T, P, HP])
  useEffect(() => () => Object.values(arquitectura).forEach((g) => g.dispose()), [arquitectura])

  // ── Materiales y texturas ──
  const marmol = useMemo(() => {
    const t = texturaMarmol()
    t.repeat.set((V + 2 * T) / 2, (L + 2 * T) / 2)
    t.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
    return t
  }, [V, L, T, gl])
  const roseton = useMemo(() => texturaRoseton(), [])
  const claraboya = useMemo(() => texturaClaraboya(3, 3), [])
  useEffect(() => () => marmol.dispose(), [marmol])
  useEffect(() => () => roseton.dispose(), [roseton])
  useEffect(() => () => claraboya.dispose(), [claraboya])

  const mat = useMemo(
    () => ({
      suelo: new MeshStandardMaterial({ map: marmol, roughness: 0.3, metalness: 0 }),
      roseton: new MeshStandardMaterial({
        map: roseton,
        transparent: true,
        roughness: 0.35,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      }),
      techo: new MeshStandardMaterial({ color: '#f3ece2', roughness: 1, emissive: '#e6d6c1', emissiveIntensity: 0.55 }),
      marcoClaraboya: new MeshStandardMaterial({ color: '#d8ccbd', roughness: 0.8, emissive: '#d8ccbd', emissiveIntensity: 0.4 }),
      claraboya: new MeshBasicMaterial({ map: claraboya, toneMapped: false }),
    }),
    [marmol, roseton, claraboya],
  )
  useEffect(() => () => Object.values(mat).forEach((m) => m.dispose()), [mat])

  // Claraboyas repartidas a lo largo de la galería.
  const numClaraboyas = Math.max(1, Math.round(L / 13))
  const largoClaraboya = Math.min(5.2, L / numClaraboyas - 3)
  const claraboyas = Array.from({ length: numClaraboyas }, (_, i) => -L / 2 + (L * (i + 0.5)) / numClaraboyas)
  const sur = paredes.find((p) => p.lado === 'sur')!

  return (
    <group ref={grupo}>
      {/* Suelo de mármol (cubre también media puerta de cada sala) y rosetón central */}
      <mesh geometry={PLANO} material={mat.suelo} rotation-x={-Math.PI / 2} scale={[V + 2 * T, L + 2 * T, 1]} />
      <mesh geometry={PLANO} material={mat.roseton} rotation-x={-Math.PI / 2} position={[0, 0.002, 0]} scale={[6, 6, 1]} renderOrder={1} />

      {/* Techo y claraboyas */}
      <mesh geometry={PLANO} material={mat.techo} position={[0, H, 0]} rotation-x={Math.PI / 2} scale={[V, L, 1]} />
      {claraboyas.map((z) => (
        <group key={z} position={[0, H, z]}>
          <mesh geometry={PLANO} material={mat.marcoClaraboya} position={[0, -0.004, 0]} rotation-x={Math.PI / 2} scale={[5.6, largoClaraboya + 0.4, 1]} />
          <mesh geometry={PLANO} material={mat.claraboya} position={[0, -0.008, 0]} rotation-x={Math.PI / 2} scale={[5.2, largoClaraboya, 1]} />
        </group>
      ))}

      <Arquitectura geos={arquitectura} />

      {paredes.map((pared) => (
        <CartelesPared key={pared.lado} pared={pared} />
      ))}

      {/* Título del museo sobre la puerta principal */}
      <group position={sur.origen} rotation-y={(sur.giro * Math.PI) / 2}>
        <Rotulo titulo={TITULO_MUSEO} subtitulo={lemaMuseo(numSalas)} posicion={[0, HP + 1.15, 0.012]} ancho={7} />
      </group>

      <Pedestal texto={TITULO_MUSEO} />
      {ESQUINAS.map(([sx, sz]) => (
        <Planta key={`${sx}${sz}`} position={[sx * (V / 2 - 0.8), 0, sz * (L / 2 - 0.8)]} escala={1.35} />
      ))}
    </group>
  )
}
