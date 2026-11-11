import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  MeshStandardMaterial,
  Vector3,
  type Group,
  type Material,
  type Mesh,
  type MeshPhysicalMaterial,
  type Object3D,
} from 'three'
import urlIoana from '../../model/ioana_web_draco.glb?url'
import { CAMARA, ES_TACTIL, JUGADOR, URL_BASE } from '../config'
import { leerMovimiento, type Movimiento } from '../entrada/entrada'
import { controlesBloqueados } from '../estado'
import { resolverCirculo } from '../mundo/colisiones'
import { PLANO } from '../mundo/geometrias'
import { texturaDegradadoRadial } from '../mundo/texturas'
import { damp, dampAngulo } from '../util/matematicas'
import { camara, jugador } from './estadoCompartido'

const RUTA_DRACO = `${URL_BASE}draco/`
useGLTF.preload(urlIoana, RUTA_DRACO)

interface Partes {
  brazos: { nodo: Object3D; lado: number; y0: number }[]
  cuerpo?: Object3D
  cabeza?: Object3D
  cabezaY0: number
}

/**
 * El GLB de Ioana no tiene esqueleto ni animaciones, pero está dividido en piezas con pivotes útiles:
 * Arm_L / Arm_R (pivote en el hombro), Body y Head (pivote en el cuello). Las animamos por código.
 */
function prepararModelo(escena: Object3D, ligero: boolean): Partes {
  escena.traverse((o) => {
    const malla = o as Mesh
    if (!malla.isMesh) return
    malla.castShadow = malla.receiveShadow = false
    // En móvil: MeshPhysicalMaterial (sheen/specular) → MeshStandardMaterial, bastante más barato.
    const mat = malla.material as Material
    if (ligero && (mat as MeshPhysicalMaterial).isMeshPhysicalMaterial) {
      const estandar = new MeshStandardMaterial().copy(mat as MeshPhysicalMaterial)
      estandar.name = mat.name
      malla.material = estandar
      mat.dispose()
    }
  })
  const raiz = escena.getObjectByName('Ioana') ?? escena
  const brazos = ['Arm_L', 'Arm_R']
    .map((n) => escena.getObjectByName(n))
    .filter((n): n is Object3D => !!n)
    .map((nodo) => ({ nodo, lado: Math.sign(nodo.position.x) || 1, y0: nodo.position.y }))
  const cuerpo = escena.getObjectByName('Body')
  // GLTFLoader renombra "Head.001" a "Head001".
  const cabeza = raiz.children.find((c) => /^head/i.test(c.name) && c.children.length > 0)
  return { brazos, cuerpo, cabeza, cabezaY0: cabeza?.position.y ?? 0 }
}

const anim = { fase: 0, intensidad: 0 }

/** Animación procedural: andar "de pato" adorable (rebote, balanceo, brazos) y respiración en reposo. */
function animar(p: Partes, envoltorio: Group, rapidezNorm: number, dt: number, t: number) {
  const objetivo = rapidezNorm > 0.06 ? Math.min(rapidezNorm, 1.25) : 0
  anim.intensidad = damp(anim.intensidad, objetivo, 9, dt)
  const w = anim.intensidad
  const reposo = 1 - Math.min(w, 1)
  anim.fase += dt * (6 + 6 * Math.min(rapidezNorm, 1.7))
  const s = Math.sin(anim.fase)

  envoltorio.position.y = Math.abs(s) * 0.065 * w
  envoltorio.rotation.set(0.06 * w, s * 0.06 * w, s * 0.075 * w)

  const respiracion = Math.sin(t * 2.3) * 0.012 * reposo
  if (p.cuerpo) p.cuerpo.scale.y = 1 + respiracion
  if (p.cabeza) {
    p.cabeza.position.y = p.cabezaY0 + 0.85 * respiracion
    p.cabeza.rotation.set(
      Math.sin(anim.fase * 2) * 0.03 * w + Math.sin(t * 0.9) * 0.02 * reposo,
      Math.sin(t * 0.5) * 0.14 * reposo,
      -s * 0.045 * w + Math.sin(t * 0.7) * 0.03 * reposo,
    )
  }
  for (const b of p.brazos) {
    b.nodo.position.y = b.y0 + 0.68 * respiracion
    b.nodo.rotation.set(b.lado * s * 0.6 * w + Math.sin(t * 2.3 + 0.6) * 0.03 * reposo, 0, b.lado * (0.05 + 0.1 * w))
  }
}

export interface PuntoInicio {
  posicion: [number, number, number]
  rotacionY: number
}

export function Jugador({ inicio }: { inicio: PuntoInicio }) {
  const { scene } = useGLTF(urlIoana, RUTA_DRACO)
  const partes = useMemo(() => prepararModelo(scene, ES_TACTIL), [scene])
  const raiz = useRef<Group>(null)
  const envoltorio = useRef<Group>(null)
  const sombra = useRef<Mesh>(null)
  const tmp = useMemo(() => ({ mov: { x: 0, y: 0, correr: false } as Movimiento, deseada: new Vector3(), previa: new Vector3() }), [])

  useLayoutEffect(() => {
    jugador.posicion.set(...inicio.posicion)
    jugador.rotacionY = inicio.rotacionY
    jugador.velocidad.set(0, 0, 0)
    jugador.rapidez = 0
    camara.yaw = inicio.rotacionY + Math.PI // detrás del personaje
  }, [inicio])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20)
    if (dt < 1e-4 || !raiz.current || !envoltorio.current) return
    const { mov, deseada, previa } = tmp

    if (controlesBloqueados()) {
      mov.x = mov.y = 0
      mov.correr = false
    } else {
      leerMovimiento(mov)
    }

    // Movimiento relativo a la cámara: "adelante" es hacia donde mira la cámara.
    const vmax = mov.correr ? JUGADOR.velocidadCorrer : JUGADOR.velocidad
    const sy = Math.sin(camara.yaw)
    const cy = Math.cos(camara.yaw)
    deseada.set((cy * mov.x - sy * mov.y) * vmax, 0, (-sy * mov.x - cy * mov.y) * vmax)

    const k = deseada.lengthSq() >= jugador.velocidad.lengthSq() ? JUGADOR.aceleracion : JUGADOR.frenado
    jugador.velocidad.lerp(deseada, 1 - Math.exp(-k * dt))
    previa.copy(jugador.posicion)
    jugador.posicion.addScaledVector(jugador.velocidad, dt)
    resolverCirculo(jugador.posicion, JUGADOR.radio)

    // Velocidad real tras deslizar por paredes (así no "empuja" contra ellas ni anima de más).
    const vx = (jugador.posicion.x - previa.x) / dt
    const vz = (jugador.posicion.z - previa.z) / dt
    jugador.velocidad.set(vx, 0, vz)
    jugador.rapidez = damp(jugador.rapidez, Math.hypot(vx, vz), 12, dt)

    if (deseada.lengthSq() > 0.04) {
      jugador.rotacionY = dampAngulo(jugador.rotacionY, Math.atan2(deseada.x, deseada.z), JUGADOR.giro, dt)
    }

    raiz.current.position.copy(jugador.posicion)
    // Si la cámara se pega a Ioana (p. ej. de espaldas a una pared), mejor no verla por dentro.
    raiz.current.visible = camara.distanciaActual > CAMARA.ocultarPersonajeA
    raiz.current.rotation.y = jugador.rotacionY
    animar(partes, envoltorio.current, jugador.rapidez / JUGADOR.velocidad, dt, state.clock.elapsedTime)

    if (sombra.current) {
      const s = 0.95 * (1 - envoltorio.current.position.y * 1.8)
      sombra.current.position.set(jugador.posicion.x, 0.012, jugador.posicion.z)
      sombra.current.scale.set(s, s, 1)
    }
  }, -2)

  return (
    <>
      <group ref={raiz}>
        <group ref={envoltorio}>
          <primitive object={scene} />
        </group>
      </group>
      {/* Sombra de contacto falsa: un degradado bajo los pies (mucho más barato que sombras reales). */}
      <mesh ref={sombra} geometry={PLANO} rotation-x={-Math.PI / 2} renderOrder={1}>
        <meshBasicMaterial
          map={texturaDegradadoRadial()}
          color="#1a0f08"
          transparent
          opacity={0.55}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>
    </>
  )
}
