import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  AdditiveBlending,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  type BufferGeometry,
  type Group,
  type Mesh,
  type Texture,
} from 'three'
import { SALA, type Tema } from '../config'
import { useEstado } from '../estado'
import { urlRecurso, type Foto } from '../galeria/datos'
import { damp } from '../util/matematicas'
import { CAJA, CILINDRO, CIRCULO, fusionar, PLANO, trs } from './geometrias'
import { registrarCuadro } from './registroCuadros'
import { texturaDegradadoRadial, texturaPlaca, texturaProvisional } from './texturas'

interface Props {
  foto: Foto
  salaId: string
  /** Posición de la sala en el recorrido y su nombre (para los cuadros provisionales). */
  orden: number
  etiqueta: string
  tema: Tema
  posicion: [number, number, number]
  rotacionY: number
  /** Tamaño de la foto (sin marco) en metros. */
  ancho: number
  alto: number
  /** false = todavía no se ha visto la sala: no se descarga la foto (carga perezosa). */
  cargar: boolean
}

const PASPARTU = 0.09
const MARCO = 0.055
const FONDO_MARCO = 0.05
const SEPARACION_FOCO = 1.35
const LUZ_REPOSO = 0.26
const LUZ_ACTIVO = 0.62

// Marco + paspartú en una malla, y el foco del techo (varilla, cabeza y luz) en otra: 2 draw calls en vez de 5.
const MAT_MARCO = new MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.05 })
const MAT_FOCO = new MeshBasicMaterial({ vertexColors: true, toneMapped: false })

// Todos los cuadros cuelgan a la misma altura, así que el foco (y su inclinación) es idéntico para todos.
const ALTO_FOCO = SALA.alto - 0.24 - SALA.alturaCuadros
const ANGULO_FOCO = Math.atan2(SEPARACION_FOCO, ALTO_FOCO)
let geoFoco: BufferGeometry | null = null
const geometriaFoco = () =>
  (geoFoco ??= fusionar([
    { geometria: CILINDRO, matriz: trs([0, 0.12, 0], [0.012, 0.24, 0.012]), color: '#2b2724' },
    { geometria: CILINDRO, matriz: trs([0, 0, 0], [0.06, 0.2, 0.06], ANGULO_FOCO), color: '#2b2724' },
    {
      geometria: CIRCULO,
      matriz: trs([0, 0, 0], 1, ANGULO_FOCO).multiply(trs([0, -0.101, 0], 0.05, Math.PI / 2)),
      color: '#fff0d6',
    },
  ]))

/** Textura de la foto: muestra un provisional mientras carga (o siempre, si aún no hay foto). */
function useTexturaFoto(foto: Foto, orden: number, etiqueta: string, tema: Tema, cargar: boolean) {
  const gl = useThree((s) => s.gl)
  const provisional = useMemo(
    () => texturaProvisional(foto.indice, orden, foto.aspecto, tema.provisional, foto.provisional, etiqueta),
    [foto.indice, orden, etiqueta, foto.aspecto, tema.provisional, foto.provisional],
  )
  const [cargada, setCargada] = useState<Texture | null>(null)

  useEffect(() => {
    if (!foto.pared || !cargar) return
    let vivo = true
    const t = new TextureLoader().load(urlRecurso(foto.pared), (tx) => {
      if (!vivo) return
      tx.colorSpace = SRGBColorSpace
      tx.anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy())
      setCargada(tx)
    })
    return () => {
      vivo = false
      t.dispose()
    }
  }, [foto.pared, cargar, gl])

  useEffect(() => () => provisional.dispose(), [provisional])
  return cargada ?? provisional
}

export function Cuadro({ foto, salaId, orden, etiqueta, tema, posicion, rotacionY, ancho, alto, cargar }: Props) {
  const grupo = useRef<Group>(null)
  const marco = useRef<Mesh>(null)
  const haz = useRef<MeshBasicMaterial>(null)
  const textura = useTexturaFoto(foto, orden, etiqueta, tema, cargar)
  const placa = useMemo(() => texturaPlaca(foto.titulo, foto.fecha), [foto.titulo, foto.fecha])
  useEffect(() => () => placa.dispose(), [placa])

  const totalAncho = ancho + 2 * (PASPARTU + MARCO)
  const totalAlto = alto + 2 * (PASPARTU + MARCO)
  const geoMarco = useMemo(
    () =>
      fusionar([
        { geometria: CAJA, matriz: trs([0, 0, FONDO_MARCO / 2], [totalAncho, totalAlto, FONDO_MARCO]), color: tema.marco },
        { geometria: PLANO, matriz: trs([0, 0, FONDO_MARCO + 0.001], [ancho + 2 * PASPARTU, alto + 2 * PASPARTU, 1]), color: '#f7f2ea' },
      ]),
    [totalAncho, totalAlto, ancho, alto, tema.marco],
  )
  useEffect(() => () => geoMarco.dispose(), [geoMarco])

  // Registro para el sistema de interacción (posición y normal en coordenadas del mundo).
  const [px, py, pz] = posicion
  useLayoutEffect(() => {
    const g = grupo.current!
    g.updateWorldMatrix(true, false)
    const centro = g.getWorldPosition(new Vector3())
    const normal = new Vector3(0, 0, 1).applyQuaternion(g.getWorldQuaternion(new Quaternion()))
    normal.y = 0
    normal.normalize()
    return registrarCuadro({
      id: foto.id,
      salaId,
      indice: foto.indice,
      posicion: centro,
      normal,
      ancho: totalAncho,
      malla: marco.current!,
    })
  }, [foto.id, foto.indice, salaId, totalAncho, px, py, pz, rotacionY])

  // Resalte suave cuando el jugador está delante.
  const activo = useRef(false)
  useEffect(() => {
    activo.current = useEstado.getState().cercano?.id === foto.id
    return useEstado.subscribe((s) => {
      activo.current = s.cercano?.id === foto.id
    })
  }, [foto.id])

  useFrame((state, dt) => {
    const mat = haz.current
    if (!mat || (!activo.current && mat.opacity === LUZ_REPOSO)) return
    const objetivo = activo.current ? LUZ_ACTIVO + Math.sin(state.clock.elapsedTime * 2.5) * 0.06 : LUZ_REPOSO
    mat.opacity = damp(mat.opacity, objetivo, 6, Math.min(dt, 0.05))
    if (!activo.current && Math.abs(mat.opacity - LUZ_REPOSO) < 0.003) mat.opacity = LUZ_REPOSO
  })

  return (
    <group ref={grupo} position={posicion} rotation-y={rotacionY}>
      {/* Haz de luz cálido sobre la pared (truco barato en vez de un SpotLight real por cuadro).
          Se intensifica cuando te acercas, como un foco con sensor. */}
      <mesh geometry={PLANO} position={[0, 0.28, 0.006]} scale={[totalAncho * 1.5 + 0.7, totalAlto * 1.6 + 0.5, 1]} renderOrder={1}>
        <meshBasicMaterial
          ref={haz}
          color="#ffdcb4"
          map={texturaDegradadoRadial()}
          transparent
          opacity={LUZ_REPOSO}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>

      <mesh ref={marco} geometry={geoMarco} material={MAT_MARCO} />
      <mesh geometry={PLANO} position={[0, 0, FONDO_MARCO + 0.003]} scale={[ancho, alto, 1]}>
        <meshBasicMaterial map={textura} color="#efe9e1" toneMapped={false} />
      </mesh>

      {/* Cartela */}
      <mesh geometry={PLANO} position={[0, -totalAlto / 2 - 0.15, 0.012]} scale={[0.46, 0.135, 1]}>
        <meshStandardMaterial map={placa} roughness={0.75} />
      </mesh>

      {/* Foco de carril en el techo apuntando al cuadro */}
      <mesh geometry={geometriaFoco()} material={MAT_FOCO} position={[0, ALTO_FOCO, SEPARACION_FOCO]} />
    </group>
  )
}
