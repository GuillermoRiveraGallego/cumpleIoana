import { Environment, Lightformer } from '@react-three/drei'
import { VESTIBULO } from '../config'

/**
 * Iluminación cálida y barata para móvil:
 *  - un mapa de entorno generado UNA vez a partir de paneles de luz (reflejos y luz difusa suave),
 *  - una luz hemisférica de relleno,
 *  - una sola luz direccional (sin sombras) para dar volumen al personaje.
 * Los "focos" de los cuadros son planos aditivos, no luces reales.
 */
export function Iluminacion() {
  const m = VESTIBULO.ancho / 2
  return (
    <>
      <hemisphereLight args={['#fff1df', '#7a5a43', 0.75]} />
      <directionalLight position={[2.5, 6, 4]} intensity={1.15} color="#ffe0bd" />
      <Environment frames={1} resolution={128} environmentIntensity={0.85}>
        <color attach="background" args={['#3a2a20']} />
        {/* Claraboya */}
        <Lightformer form="rect" intensity={2.4} color="#fff3e2" scale={[5.5, 5.5, 1]} position={[0, VESTIBULO.alto, 0]} rotation-x={Math.PI / 2} />
        {/* Paredes iluminadas (luz rebotada cálida) */}
        <Lightformer form="rect" intensity={0.9} color="#ffcf9f" scale={[14, 3, 1]} position={[0, 2.4, -m]} />
        <Lightformer form="rect" intensity={0.7} color="#ffd8b2" scale={[14, 3, 1]} position={[-m, 2.4, 0]} rotation-y={Math.PI / 2} />
        <Lightformer form="rect" intensity={0.7} color="#ffd8b2" scale={[14, 3, 1]} position={[m, 2.4, 0]} rotation-y={-Math.PI / 2} />
        <Lightformer form="rect" intensity={0.5} color="#ffe6cc" scale={[14, 3, 1]} position={[0, 2.4, m]} rotation-y={Math.PI} />
        {/* Rebote del suelo */}
        <Lightformer form="rect" intensity={0.35} color="#b07a4f" scale={[14, 14, 1]} position={[0, -0.5, 0]} rotation-x={-Math.PI / 2} />
      </Environment>
    </>
  )
}
