import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  Color,
  DoubleSide,
  Euler,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from 'three'
import { useEstado } from '../../estado'
import { aleatorio } from '../../util/matematicas'
import { PLANO } from '../geometrias'

type V3 = [number, number, number]

const DE_LA_TARTA = 420
const DEL_TECHO = 300
const N = DE_LA_TARTA + DEL_TECHO
const GRAVEDAD = 9.8
const COLORES = ['#f2c14e', '#e36588', '#5bc0be', '#9b72cf', '#f78154', '#ffffff', '#7bd389', '#ffd6e0']

const MATERIAL = new MeshStandardMaterial({ side: DoubleSide, roughness: 0.45, metalness: 0.2 })

interface Props {
  /** De dónde sale disparado (local a la sala): encima de la tarta. */
  origen: V3
  /** Mesa: el confeti que cae encima se queda sobre el mantel. */
  mesa: { x: number; z: number; radio: number; alto: number }
  ancho: number
  fondo: number
  alto: number
}

/**
 * Confeti al apagar las velas: una ráfaga sale disparada de la tarta y otra llueve del techo. Revolotea al caer
 * y se queda en el suelo (y sobre la mesa). Una sola malla instanciada (1 llamada de dibujo); cuando todo ha
 * aterrizado deja de calcularse.
 */
export function Confeti({ origen, mesa, ancho, fondo, alto }: Props) {
  const malla = useRef<InstancedMesh>(null)
  const p = useMemo(
    () => ({
      pos: new Float32Array(N * 3),
      vel: new Float32Array(N * 3),
      rot: new Float32Array(N * 3),
      giro: new Float32Array(N * 3),
      tam: new Float32Array(N * 2),
      fase: new Float32Array(N),
      caida: new Float32Array(N),
      espera: new Float32Array(N),
      posado: new Uint8Array(N),
      activo: false,
      tiempo: 0,
    }),
    [],
  )
  const tmp = useMemo(() => ({ m: new Matrix4(), q: new Quaternion(), e: new Euler(), v: new Vector3(), s: new Vector3() }), [])

  // Colores fijos por pieza.
  useEffect(() => {
    const m = malla.current!
    const r = aleatorio(21)
    const c = new Color()
    for (let i = 0; i < N; i++) m.setColorAt(i, c.set(COLORES[Math.floor(r() * COLORES.length)]))
    m.instanceColor!.needsUpdate = true
    m.count = 0
  }, [])

  // Disparo al apagar las velas.
  useEffect(() => {
    const lanzar = () => {
      const r = aleatorio(Math.floor(Math.random() * 1e9))
      for (let i = 0; i < N; i++) {
        const j = i * 3
        if (i < DE_LA_TARTA) {
          const a = r() * Math.PI * 2
          const h = 0.4 + r() * 2.2
          p.pos.set([origen[0] + (r() - 0.5) * 0.3, origen[1] + r() * 0.1, origen[2] + (r() - 0.5) * 0.3], j)
          p.vel.set([Math.cos(a) * h, 4 + r() * 3.5, Math.sin(a) * h], j)
          p.espera[i] = r() * 0.25
        } else {
          p.pos.set([(r() - 0.5) * (ancho - 0.6), alto - 0.1, (r() - 0.5) * (fondo - 0.6)], j)
          p.vel.set([0, -0.2, 0], j)
          p.espera[i] = 0.3 + r() * 2.2
        }
        p.rot.set([r() * 6.3, r() * 6.3, r() * 6.3], j)
        p.giro.set([(r() - 0.5) * 14, (r() - 0.5) * 14, (r() - 0.5) * 14], j)
        const largo = 0.045 + r() * 0.03
        p.tam.set([largo * (0.45 + r() * 0.3), largo], i * 2)
        p.fase[i] = r() * 6.3
        p.caida[i] = 0.6 + r() * 0.6
        p.posado[i] = 0
      }
      p.activo = true
      p.tiempo = 0
      malla.current!.count = N
    }
    return useEstado.subscribe((s, prev) => {
      if (s.velas === 'apagadas' && prev.velas === 'soplando') lanzar()
    })
  }, [p, origen, ancho, fondo, alto])

  useFrame((_, delta) => {
    const m = malla.current
    if (!m || !p.activo) return
    const dt = Math.min(delta, 0.05)
    p.tiempo += dt
    const t = p.tiempo
    const { m: mat, q, e, v, s } = tmp
    const limX = ancho / 2 - 0.03
    const limZ = fondo / 2 - 0.03
    let enVuelo = 0

    for (let i = 0; i < N; i++) {
      const j = i * 3
      if (p.espera[i] > t) {
        // Aún no ha salido: invisible.
        m.setMatrixAt(i, mat.makeScale(0, 0, 0))
        enVuelo++
        continue
      }
      if (!p.posado[i]) {
        enVuelo++
        let vx = p.vel[j]
        let vy = p.vel[j + 1]
        let vz = p.vel[j + 2]
        // Gravedad con rozamiento: sube rápido, pero cae despacio y revoloteando, como el papel.
        vy -= GRAVEDAD * dt
        if (vy < -p.caida[i]) vy += (-p.caida[i] - vy) * (1 - Math.exp(-8 * dt))
        const roce = Math.exp(-1.6 * dt)
        vx *= roce
        vz *= roce
        let x = p.pos[j] + (vx + Math.sin(t * 2.7 + p.fase[i]) * 0.35) * dt
        let y = p.pos[j + 1] + vy * dt
        let z = p.pos[j + 2] + (vz + Math.cos(t * 2.1 + p.fase[i]) * 0.35) * dt
        if (y > alto - 0.05) {
          y = alto - 0.05
          vy = -Math.abs(vy) * 0.2
        }
        if (Math.abs(x) > limX) {
          x = Math.sign(x) * limX
          vx = -vx * 0.3
        }
        if (Math.abs(z) > limZ) {
          z = Math.sign(z) * limZ
          vz = -vz * 0.3
        }
        // Aterriza en el suelo o sobre el mantel, tumbado y con un giro al azar.
        const sobreMesa = Math.hypot(x - mesa.x, z - mesa.z) < mesa.radio
        const suelo = sobreMesa ? mesa.alto : 0
        if (y <= suelo + 0.004 && vy < 0) {
          y = suelo + 0.003 + (i % 7) * 0.0004
          p.posado[i] = 1
          p.rot[j] = -Math.PI / 2
          p.rot[j + 1] = 0
        } else {
          p.rot[j] += p.giro[j] * dt
          p.rot[j + 1] += p.giro[j + 1] * dt
          p.rot[j + 2] += p.giro[j + 2] * dt
        }
        p.pos[j] = x
        p.pos[j + 1] = y
        p.pos[j + 2] = z
        p.vel[j] = vx
        p.vel[j + 1] = vy
        p.vel[j + 2] = vz
      }
      e.set(p.rot[j], p.rot[j + 1], p.rot[j + 2])
      q.setFromEuler(e)
      v.set(p.pos[j], p.pos[j + 1], p.pos[j + 2])
      s.set(p.tam[i * 2], p.tam[i * 2 + 1], 1)
      m.setMatrixAt(i, mat.compose(v, q, s))
    }
    m.instanceMatrix.needsUpdate = true
    if (enVuelo === 0) p.activo = false
  })

  return (
    // Las piezas vuelan por toda la sala: el volumen de la geometría base no sirve para descartarla.
    <instancedMesh ref={malla} args={[PLANO, MATERIAL, N]} frustumCulled={false} />
  )
}
