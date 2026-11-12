import { PerformanceMonitor } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { NeutralToneMapping } from 'three'
import { ES_TACTIL } from './config'
import { CapaControles } from './entrada/CapaControles'
import { useTeclado } from './entrada/entrada'
import { useEstado } from './estado'
import { cargarFuentes, cargarSalas, type Sala as DatosSala } from './galeria/datos'
import { CamaraTerceraPersona } from './jugador/Camara'
import { Jugador } from './jugador/Jugador'
import { Iluminacion } from './mundo/Iluminacion'
import { calcularDisposicion } from './mundo/disposicion'
import { Interaccion } from './mundo/Interaccion'
import { Museo } from './mundo/Museo'
import { Hud } from './ui/Hud'
import { Intro } from './ui/Intro'
import { Soplar } from './ui/Soplar'
import { Visor } from './ui/Visor'

function Escena({ salas }: { salas: DatosSala[] }) {
  const setEscenaLista = useEstado((s) => s.setEscenaLista)
  // Se ejecuta cuando todo lo de dentro del <Suspense> (modelo incluido) ya está cargado.
  useEffect(() => setEscenaLista(), [setEscenaLista])
  // Tamaño y posición de cada sala según sus fotos (ver mundo/disposicion.ts).
  const disposicion = useMemo(() => calcularDisposicion(salas), [salas])
  return (
    <>
      <color attach="background" args={['#120c09']} />
      <Iluminacion />
      <Museo disposicion={disposicion} />
      <Jugador inicio={disposicion.inicio} />
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
        camera={{ fov: 55, near: 0.1, far: 140, position: [0, 2.5, 8] }}
        onCreated={({ gl }) => {
          gl.toneMapping = NeutralToneMapping
          gl.toneMappingExposure = 1.05
          if (import.meta.env.DEV) Object.assign(window, { __gl: gl })
        }}
      >
        <PerformanceMonitor onDecline={() => setDprMax(1)} onIncline={() => setDprMax(ES_TACTIL ? 1.5 : 2)} flipflops={3} />
        <Suspense fallback={null}>{salas && <Escena salas={salas} />}</Suspense>
      </Canvas>
      <CapaControles />
      <Hud />
      <Soplar />
      <Visor />
      <Intro />
    </div>
  )
}
