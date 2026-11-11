import { PerformanceMonitor } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useState } from 'react'
import { NeutralToneMapping } from 'three'
import { ES_TACTIL, SALA, temaDeAnio } from './config'
import { CapaControles } from './entrada/CapaControles'
import { useTeclado } from './entrada/entrada'
import { useEstado } from './estado'
import { cargarFuentes, cargarSalas, type Sala as DatosSala } from './galeria/datos'
import { CamaraTerceraPersona } from './jugador/Camara'
import { Jugador, type PuntoInicio } from './jugador/Jugador'
import { Iluminacion } from './mundo/Iluminacion'
import { Interaccion } from './mundo/Interaccion'
import { Sala } from './mundo/Sala'
import { Hud } from './ui/Hud'
import { Intro } from './ui/Intro'
import { Visor } from './ui/Visor'

// Prototipo (fase 1): una sala. Ioana aparece cerca de la entrada mirando hacia el fondo.
const INICIO: PuntoInicio = { posicion: [0, 0, SALA.fondo / 2 - 4.5], rotacionY: Math.PI }

function Escena({ salas }: { salas: DatosSala[] }) {
  const setEscenaLista = useEstado((s) => s.setEscenaLista)
  // Se ejecuta cuando todo lo de dentro del <Suspense> (modelo incluido) ya está cargado.
  useEffect(() => setEscenaLista(), [setEscenaLista])
  const sala = salas[0]
  return (
    <>
      <color attach="background" args={['#120c09']} />
      <Iluminacion />
      <Sala sala={sala} tema={temaDeAnio(sala.anio)} />
      <Jugador inicio={INICIO} />
      <CamaraTerceraPersona />
      <Interaccion />
    </>
  )
}

export default function App() {
  useTeclado()
  const salas = useEstado((s) => s.salas)
  const setSalas = useEstado((s) => s.setSalas)
  const visorAbierto = useEstado((s) => s.visor !== null)
  // Resolución máxima: en móvil 1.5x es casi indistinguible de 3x y cuesta muchísimo menos.
  const [dprMax, setDprMax] = useState(ES_TACTIL ? 1.5 : 2)

  useEffect(() => {
    let vivo = true
    Promise.all([cargarSalas(), cargarFuentes()]).then(([s]) => vivo && setSalas(s))
    return () => {
      vivo = false
    }
  }, [setSalas])

  return (
    <div className="app">
      <Canvas
        className="lienzo"
        dpr={[1, dprMax]}
        // Con la foto ampliada abierta no hace falta renderizar el museo: ahorra batería.
        frameloop={visorAbierto ? 'never' : 'always'}
        gl={{ antialias: true, powerPreference: 'high-performance', stencil: false }}
        camera={{ fov: 55, near: 0.1, far: 60, position: [0, 2.5, 6] }}
        onCreated={({ gl }) => {
          gl.toneMapping = NeutralToneMapping
          gl.toneMappingExposure = 1.05
        }}
      >
        <PerformanceMonitor onDecline={() => setDprMax(1)} onIncline={() => setDprMax(ES_TACTIL ? 1.5 : 2)} flipflops={3} />
        <Suspense fallback={null}>{salas && <Escena salas={salas} />}</Suspense>
      </Canvas>
      <CapaControles />
      <Hud />
      <Visor />
      <Intro />
    </div>
  )
}
