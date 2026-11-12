import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  Color,
  CylinderGeometry,
  MeshStandardMaterial,
  NormalBlending,
  Vector3,
  type Group,
  type Mesh,
} from 'three'
import { CAMARA, CUMPLE } from '../../config'
import { actualizarSoplido, soplido } from '../../entrada/microfono'
import { useEstado } from '../../estado'
import { camara, jugador } from '../../jugador/estadoCompartido'
import { aleatorio, clamp, damp, dampAngulo } from '../../util/matematicas'
import { registrarCilindros } from '../colisiones'
import { CAJA, CILINDRO, en, fusionar, ICOSAEDRO, marcoEn, trs, type Pieza } from '../geometrias'
import { texturaDegradadoRadial, texturaLlama } from '../texturas'
import { registrarTarta } from './registro'
import { Sprites } from './sprites'

type V3 = [number, number, number]

// Medidas (m). La mesa es redonda con un mantel hasta el suelo; la tarta, de dos pisos sobre una peana.
const MESA = 0.76
const R_MESA = 0.66
const Y1 = MESA + 0.085 // base del piso de abajo (encima de la peana)
const PISO1 = { r: 0.33, h: 0.2 }
const PISO2 = { r: 0.2, h: 0.16 }
const Y2 = Y1 + PISO1.h
const Y3 = Y2 + PISO2.h
const ALTO_VELA = 0.12
const MAX_VELAS = 36
/** Altura de la parte de arriba de la tarta (de aquí sale el confeti). */
export const ALTURA_TARTA = Y3 + ALTO_VELA

const COLORES_VELA = ['#8ecae6', '#ffb4c8', '#ffe28a', '#b8e0b0', '#d0b8ff', '#ffc9a3']

/** Regalos alrededor de la mesa (coordenadas locales de la tarta). */
const REGALOS: { pos: V3; tam: V3; giro: number; color: string; lazo: string }[] = [
  { pos: [1.02, 0, -0.32], tam: [0.44, 0.34, 0.44], giro: 0.35, color: '#5fb3b3', lazo: '#f7e3a1' },
  { pos: [0.88, 0, 0.36], tam: [0.28, 0.22, 0.28], giro: -0.5, color: '#f2a65a', lazo: '#fff6e6' },
  { pos: [-1.0, 0, -0.18], tam: [0.36, 0.46, 0.36], giro: 0.2, color: '#9b72cf', lazo: '#ffd3e0' },
  { pos: [-0.72, 0, -0.84], tam: [0.3, 0.26, 0.3], giro: 0.8, color: '#e36588', lazo: '#fff6e6' },
]

/** Posición de la base de cada vela: hasta 12 en el piso de arriba y el resto en el borde del de abajo. */
function posicionesVelas(n: number): V3[] {
  n = clamp(Math.round(n), 1, MAX_VELAS)
  if (n === 1) return [[0, Y3, 0]]
  const anillo = (k: number, r: number, y: number, desfase: number): V3[] =>
    Array.from({ length: k }, (_, i) => {
      const a = desfase + (i / k) * Math.PI * 2
      return [Math.sin(a) * r, y, Math.cos(a) * r]
    })
  const arriba = Math.min(n, 12)
  return [...anillo(arriba, arriba <= 4 ? 0.09 : 0.135, Y3, 0), ...anillo(n - arriba, 0.265, Y2, 0.13)]
}

function geometriaTarta(velas: V3[]) {
  const r = aleatorio(7)
  const liso = new CylinderGeometry(1, 1, 1, 40)
  const mantel = new CylinderGeometry(R_MESA, R_MESA + 0.08, MESA, 40)
  const p: Pieza[] = []
  const pieza = (geometria: Pieza['geometria'], matriz: Pieza['matriz'], color: string) => p.push({ geometria, matriz, color })
  /** Anillo de bolitas de nata (manga pastelera). */
  const nata = (k: number, radio: number, y: number, tam: number, color: string) => {
    for (let i = 0; i < k; i++) {
      const a = (i / k) * Math.PI * 2
      pieza(ICOSAEDRO, trs([Math.sin(a) * radio, y, Math.cos(a) * radio], tam), color)
    }
  }

  // Mesa con mantel y ribete dorado
  pieza(mantel, trs([0, MESA / 2, 0], 1), '#fbf4ec')
  pieza(liso, trs([0, MESA - 0.012, 0], [R_MESA + 0.006, 0.026, R_MESA + 0.006]), '#e2c48e')
  // Peana
  pieza(liso, trs([0, MESA + 0.03, 0], [0.09, 0.06, 0.09]), '#f1e4cf')
  pieza(liso, trs([0, MESA + 0.0725, 0], [0.4, 0.025, 0.4]), '#f1e4cf')
  // Piso de abajo (fresa), con nata arriba y chorretones
  pieza(liso, trs([0, Y1 + PISO1.h / 2, 0], [PISO1.r, PISO1.h, PISO1.r]), '#f4b3c4')
  pieza(liso, trs([0, Y2 + 0.003, 0], [PISO1.r + 0.004, 0.008, PISO1.r + 0.004]), '#fffaf3')
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + r() * 0.12
    const largo = 0.03 + r() * 0.07
    const x = Math.sin(a) * (PISO1.r + 0.002)
    const z = Math.cos(a) * (PISO1.r + 0.002)
    pieza(CILINDRO, trs([x, Y2 - largo / 2, z], [0.014, largo, 0.014]), '#fffaf3')
    pieza(ICOSAEDRO, trs([x, Y2 - largo, z], 0.015), '#fffaf3')
  }
  nata(30, PISO1.r, Y1 + 0.012, 0.024, '#fff4e4')
  // Piso de arriba (vainilla) con nata rosa
  pieza(liso, trs([0, Y2 + PISO2.h / 2, 0], [PISO2.r, PISO2.h, PISO2.r]), '#fff1dc')
  nata(22, PISO2.r - 0.008, Y3, 0.022, '#f7c1cf')
  nata(22, PISO2.r, Y2 + 0.016, 0.02, '#f7c1cf')
  // Fresas en el borde del piso de abajo, si las velas no lo ocupan
  if (velas.length <= 12) {
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.35
      const x = Math.sin(a) * 0.265
      const z = Math.cos(a) * 0.265
      pieza(ICOSAEDRO, trs([x, Y2 + 0.03, z], [0.028, 0.035, 0.028]), '#d7263d')
      pieza(CILINDRO, trs([x, Y2 + 0.064, z], [0.02, 0.008, 0.02]), '#4f8a3c')
    }
  }
  // Velas con su mecha
  velas.forEach(([x, y, z], i) => {
    pieza(CILINDRO, trs([x, y + ALTO_VELA / 2, z], [0.012, ALTO_VELA, 0.012]), COLORES_VELA[i % COLORES_VELA.length])
    pieza(CAJA, trs([x, y + ALTO_VELA + 0.008, z], [0.004, 0.016, 0.004]), '#2a2522')
  })
  // Regalos: caja, cintas cruzadas y lazo
  for (const { pos, tam, giro, color, lazo } of REGALOS) {
    const m = marcoEn(pos, giro)
    const [w, h, d] = tam
    pieza(CAJA, en(m, trs([0, h / 2, 0], tam)), color)
    pieza(CAJA, en(m, trs([0, h / 2, 0], [w + 0.006, h + 0.006, 0.06])), lazo)
    pieza(CAJA, en(m, trs([0, h / 2, 0], [0.06, h + 0.006, d + 0.006])), lazo)
    pieza(ICOSAEDRO, en(m, trs([-0.05, h + 0.03, 0], [0.06, 0.035, 0.03])), lazo)
    pieza(ICOSAEDRO, en(m, trs([0.05, h + 0.03, 0], [0.06, 0.035, 0.03])), lazo)
    pieza(ICOSAEDRO, en(m, trs([0, h + 0.02, 0], 0.025)), lazo)
  }

  const g = fusionar(p)
  liso.dispose()
  mantel.dispose()
  return g
}

const MAT_TARTA = new MeshStandardMaterial({ vertexColors: true, roughness: 0.55 })
const COLOR_LLAMA = new Color('#fff1c9').multiplyScalar(1.6)
const COLOR_HALO = new Color('#ff9a3c')
const COLOR_HUMO = new Color('#cfc7bf')
const HUMOS_POR_VELA = 3

/**
 * Mesa con la tarta, las velas y los regalos. Las velas se apagan con `soplido.fuerza` (micro o botón):
 * cada una aguanta un poco distinto, así que un soplido corto apaga solo algunas.
 * Mientras se sopla, gira a Ioana hacia la tarta y pone la cámara enfrente, con la tarta en primer plano.
 */
export function Tarta({ position }: { position: V3 }) {
  const grupo = useRef<Group>(null)
  const malla = useRef<Mesh>(null)
  const velas = useMemo(() => posicionesVelas(CUMPLE.velas), [])
  const n = velas.length
  const geo = useMemo(() => geometriaTarta(velas), [velas])
  useEffect(() => () => geo.dispose(), [geo])

  const llamas = useMemo(() => new Sprites(n * 2, texturaLlama(), AdditiveBlending), [n])
  const humo = useMemo(() => new Sprites(n * HUMOS_POR_VELA, texturaDegradadoRadial(), NormalBlending), [n])
  useEffect(() => () => llamas.dispose(), [llamas])
  useEffect(() => () => humo.dispose(), [humo])

  const e = useMemo(() => {
    const r = aleatorio(3)
    return {
      vida: new Float32Array(n).fill(1),
      brillo: new Float32Array(n).fill(1),
      /** Cuánto le cuesta apagarse a cada vela (1/s con la fuerza al máximo). */
      rapidez: Float32Array.from({ length: n }, () => 1.6 + r() * 1.6),
      humo: Array.from({ length: n * HUMOS_POR_VELA }, () => ({ x: 0, y: 0, z: 0, edad: 0, duracion: 0, fase: 0, activo: false })),
      siguienteHumo: 0,
      /** Recién apagadas: la cámara sigue encuadrando la tarta hasta que Ioana eche a andar. */
      celebrando: false,
      centro: new Vector3(),
      acumulado: 0,
    }
  }, [n])

  // Registro (para tocarla en pantalla) y colisiones de la mesa y los regalos, en coordenadas del mundo.
  const [px, py, pz] = position
  useLayoutEffect(() => {
    const g = grupo.current!
    g.updateWorldMatrix(true, false)
    g.getWorldPosition(e.centro)
    const quitarTarta = registrarTarta(malla.current!, e.centro)
    const quitarCilindros = registrarCilindros([
      { x: e.centro.x, z: e.centro.z, radio: R_MESA + 0.06 },
      ...REGALOS.map(({ pos, tam }) => {
        const v = g.localToWorld(new Vector3(...pos))
        return { x: v.x, z: v.z, radio: Math.max(tam[0], tam[2]) * 0.6 }
      }),
    ])
    return () => {
      quitarTarta()
      quitarCilindros()
    }
  }, [e, px, py, pz])

  // Al volver a encenderlas (o al dejar de soplar a medias), todas las velas vuelven a arder.
  useEffect(
    () =>
      useEstado.subscribe((s, prev) => {
        if (s.velas === prev.velas) return
        if (s.velas === 'encendidas') e.vida.fill(1)
        e.celebrando = s.velas === 'apagadas' && prev.velas === 'soplando'
      }),
    [e],
  )

  const echarHumo = (i: number) => {
    const [x, y, z] = velas[i]
    for (let k = 0; k < HUMOS_POR_VELA; k++) {
      const h = e.humo[e.siguienteHumo]
      e.siguienteHumo = (e.siguienteHumo + 1) % e.humo.length
      Object.assign(h, { x, y: y + ALTO_VELA + 0.03, z, edad: -k * 0.12, duracion: 1.6 + k * 0.4, fase: i * 1.7 + k, activo: true })
    }
  }

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime
    const st = useEstado.getState()
    const soplando = st.velas === 'soplando'

    // ¿Está Ioana junto a la tarta? (para el botón «Soplar las velas»)
    e.acumulado += dt
    if (e.acumulado > 0.1) {
      e.acumulado = 0
      const d = Math.hypot(jugador.posicion.x - e.centro.x, jugador.posicion.z - e.centro.z)
      const cerca = st.fase === 'jugando' && d < CUMPLE.distanciaTarta
      if (cerca !== st.cercaTarta) st.setCercaTarta(cerca)
    }

    // Soplido: cada vela pierde vida según la fuerza; al apagarse echa humo.
    let fuerza = 0
    if (soplando) {
      actualizarSoplido(dt)
      fuerza = soplido.fuerza
      let quedan = 0
      for (let i = 0; i < n; i++) {
        if (e.vida[i] <= 0) continue
        e.vida[i] -= fuerza * dt * e.rapidez[i]
        if (e.vida[i] <= 0) {
          e.vida[i] = 0
          echarHumo(i)
        } else {
          quedan++
        }
      }
      soplido.quedan = quedan
      if (quedan === 0) st.apagarVelas()
    } else {
      soplido.fuerza = 0
    }

    // Encuadre de «foto de cumpleaños»: Ioana mira la tarta y la cámara se pone enfrente, al otro lado, un
    // poco por encima y mirando más abajo de lo normal (la cara de Ioana y la tarta con las velas, a la vez).
    // Al terminar se queda enfrente (se ve caer el confeti); al echar a andar, vuelve detrás de ella.
    if (soplando) {
      const dx = e.centro.x - jugador.posicion.x
      const dz = e.centro.z - jugador.posicion.z
      jugador.rotacionY = dampAngulo(jugador.rotacionY, Math.atan2(dx, dz), 6, dt)
      camara.yaw = dampAngulo(camara.yaw, jugador.rotacionY, 3, dt)
      camara.pitch = damp(camara.pitch, 0.42, 3, dt)
      camara.distancia = damp(camara.distancia, clamp(Math.hypot(dx, dz) + 1.6, 2.6, 4.2), 3, dt)
    }
    if (e.celebrando && jugador.rapidez > 0.3) e.celebrando = false
    const encuadrar = soplando || e.celebrando
    camara.alturaMirada = damp(camara.alturaMirada, encuadrar ? -0.3 : CAMARA.alturaMirada, encuadrar ? 3 : 1.2, dt)

    // Llamas: núcleo + halo. Parpadean, y al soplar tiemblan y se encogen; al apagarse se consumen rápido.
    let k = 0
    for (let i = 0; i < n; i++) {
      const vivo = e.vida[i] > 0
      e.brillo[i] = damp(e.brillo[i], vivo ? 1 : 0, vivo ? 2.5 : 16, dt)
      const b = e.brillo[i]
      if (b < 0.02) continue
      const [x, y, z] = velas[i]
      const parpadeo = 1 + 0.08 * Math.sin(t * 13 + i * 1.7) + 0.05 * Math.sin(t * 23 + i * 3.1)
      const temblor = fuerza * 0.55 * Math.sin(t * 31 + i * 2.3)
      const alto = 0.075 * b * parpadeo * (1 - 0.35 * fuerza)
      const ancho = 0.034 * b * (1 + 0.2 * fuerza)
      const base = y + ALTO_VELA + 0.012
      llamas.poner(k++, x, base + alto * 0.36, z, ancho, alto, temblor, COLOR_LLAMA, 1)
      const halo = 0.17 * b * parpadeo
      llamas.poner(k++, x, base + 0.025, z, halo, halo, 0, COLOR_HALO, 0.32 * b)
    }
    llamas.actualizar(k)

    // Humo: sube ondulando, crece y se desvanece.
    let h = 0
    for (const p of e.humo) {
      if (!p.activo) continue
      p.edad += dt
      if (p.edad >= p.duracion) {
        p.activo = false
        continue
      }
      if (p.edad < 0) continue
      const u = p.edad / p.duracion
      const tam = 0.03 + p.edad * 0.09
      humo.poner(
        h++,
        p.x + Math.sin(p.edad * 3 + p.fase) * 0.025 * (1 + p.edad),
        p.y + p.edad * 0.22,
        p.z + Math.cos(p.edad * 2.3 + p.fase) * 0.02 * (1 + p.edad),
        tam,
        tam,
        p.fase,
        COLOR_HUMO,
        0.4 * (1 - u) * Math.min(1, p.edad * 8),
      )
    }
    humo.actualizar(h)
  })

  return (
    <group ref={grupo} position={position}>
      <mesh ref={malla} geometry={geo} material={MAT_TARTA} />
      <primitive object={llamas.malla} />
      <primitive object={humo.malla} />
    </group>
  )
}
