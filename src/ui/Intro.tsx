import { useProgress } from '@react-three/drei'
import { useEffect, useState } from 'react'
import { useEstado } from '../estado'
import { ListaControles } from './Ayuda'
import { IconoCorazon } from './Iconos'
import { pedirPantallaCompleta } from './pantallaCompleta'

/** Portada: carga, título y botón para entrar al museo. */
export function Intro() {
  const lista = useEstado((s) => s.escenaLista)
  const esTactil = useEstado((s) => s.esTactil)
  const entrar = useEstado((s) => s.entrar)
  const { progress } = useProgress()
  const [saliendo, setSaliendo] = useState(false)
  const [oculta, setOculta] = useState(false)

  useEffect(() => {
    if (!saliendo) return
    const t = setTimeout(() => setOculta(true), 750)
    return () => clearTimeout(t)
  }, [saliendo])

  if (oculta) return null

  const pulsar = () => {
    if (!lista || saliendo) return
    if (esTactil) pedirPantallaCompleta()
    setSaliendo(true)
    entrar()
  }

  return (
    <div className={`intro ${saliendo ? 'saliendo' : ''}`}>
      <div className="intro-tarjeta">
        <div className="intro-cabecera">
          <span className="intro-corazon">
            <IconoCorazon />
          </span>
          <h1>
            Museo de
            <br />
            nuestros recuerdos
          </h1>
          <p className="intro-sub">Cuatro años, cuatro salas.</p>

          <button className="boton-principal" onClick={pulsar} disabled={!lista} autoFocus>
            {lista ? 'Entrar' : `Preparando el museo… ${Math.round(progress)}%`}
            {!lista && <span className="barra" style={{ transform: `scaleX(${progress / 100})` }} />}
          </button>
        </div>

        <ListaControles tactil={esTactil} />
      </div>
    </div>
  )
}
