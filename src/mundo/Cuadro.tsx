import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  AdditiveBlending,
  Quaternion,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  type Group,
  type Material,
  type Mesh,
  type MeshBasicMaterial,
  type Texture,
} from 'three'
import { SALA, type Tema } from '../config'
import { useEstado } from '../estado'
import { urlRecurso, type Foto } from '../galeria/datos'
import { damp } from '../util/matematicas'
import { CAJA, CILINDRO, CIRCULO, PLANO } from './geometrias'
import { registrarCuadro } from './registroCuadros'
import { texturaDegradadoRadial, texturaPlaca, texturaProvisional } from './texturas'

export interface MaterialesCuadro {
  marco: Material
  paspartu: Material
  metal: Material
  luzFoco: Material
}

interface Props {
  foto: Foto
  salaId: string
  anio: number
  tema: Tema
  posicion: [number, number, number]
  rotacionY: number
  /** Tamaño de la foto (sin marco) en metros. */
  ancho: number
  alto: number
  materiales: MaterialesCuadro
}

const PASPARTU = 0.09
const MARCO = 0.055
const FONDO_MARCO = 0.05
const SEPARACION_FOCO = 1.35
const LUZ_REPOSO = 0.26
const LUZ_ACTIVO = 0.62

/** Textura de la foto: muestra un provisional mientras carga (o siempre, si aún no hay foto). */
function useTexturaFoto(foto: Foto, anio: number, tema: Tema) {
  const gl = useThree((s) => s.gl)
  const provisional = useMemo(
    () => texturaProvisional(foto.indice, anio, foto.aspecto, tema.provisional, foto.provisional),
    [foto.indice, anio, foto.aspecto, tema.provisional, foto.provisional],
  )
  const [cargada, setCargada] = useState<Texture | null>(null)

  useEffect(() => {
    if (!foto.pared) return
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
  }, [foto.pared, gl])

  useEffect(() => () => provisional.dispose(), [provisional])
  return cargada ?? provisional
}

export function Cuadro({ foto, salaId, anio, tema, posicion, rotacionY, ancho, alto, materiales }: Props) {
  const grupo = useRef<Group>(null)
  const marco = useRef<Mesh>(null)
  const haz = useRef<MeshBasicMaterial>(null)
  const textura = useTexturaFoto(foto, anio, tema)
  const placa = useMemo(() => texturaPlaca(foto.titulo, foto.fecha), [foto.titulo, foto.fecha])
  useEffect(() => () => placa.dispose(), [placa])

  const totalAncho = ancho + 2 * (PASPARTU + MARCO)
  const totalAlto = alto + 2 * (PASPARTU + MARCO)

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

  // Foco de carril en el techo apuntando al cuadro.
  const altoFoco = SALA.alto - 0.24 - posicion[1]
  const anguloFoco = Math.atan2(SEPARACION_FOCO, altoFoco)

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

      <mesh ref={marco} geometry={CAJA} material={materiales.marco} position={[0, 0, FONDO_MARCO / 2]} scale={[totalAncho, totalAlto, FONDO_MARCO]} />
      <mesh
        geometry={PLANO}
        material={materiales.paspartu}
        position={[0, 0, FONDO_MARCO + 0.001]}
        scale={[ancho + 2 * PASPARTU, alto + 2 * PASPARTU, 1]}
      />
      <mesh geometry={PLANO} position={[0, 0, FONDO_MARCO + 0.003]} scale={[ancho, alto, 1]}>
        <meshBasicMaterial map={textura} color="#efe9e1" toneMapped={false} />
      </mesh>

      {/* Cartela */}
      <mesh geometry={PLANO} position={[0, -totalAlto / 2 - 0.15, 0.012]} scale={[0.46, 0.135, 1]}>
        <meshStandardMaterial map={placa} roughness={0.75} />
      </mesh>

      <group position={[0, altoFoco, SEPARACION_FOCO]}>
        <mesh geometry={CILINDRO} material={materiales.metal} position={[0, 0.12, 0]} scale={[0.012, 0.24, 0.012]} />
        <group rotation-x={anguloFoco}>
          <mesh geometry={CILINDRO} material={materiales.metal} scale={[0.06, 0.2, 0.06]} />
          <mesh geometry={CIRCULO} material={materiales.luzFoco} position={[0, -0.101, 0]} rotation-x={Math.PI / 2} scale={0.05} />
        </group>
      </group>
    </group>
  )
}
