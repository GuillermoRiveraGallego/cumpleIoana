import { useEffect, useState } from 'react'
import { useEstado } from '../estado'
import { ListaControles } from './Ayuda'
import { IconoAyuda, IconoCerrar, IconoOjo, IconoPantallaCompleta, IconoSalirPantallaCompleta } from './Iconos'
import { alternarPantallaCompleta, pantallaCompletaDisponible } from './pantallaCompleta'

/** Interfaz durante el paseo: nombre de la sala, botón "Ver recuerdo", ayuda y pantalla completa. */
export function Hud() {
  const fase = useEstado((s) => s.fase)
  const salas = useEstado((s) => s.salas)
  const cercano = useEstado((s) => s.cercano)
  const visor = useEstado((s) => s.visor)
  const esTactil = useEstado((s) => s.esTactil)
  const abrirVisor = useEstado((s) => s.abrirVisor)
  const [ayuda, setAyuda] = useState(false)
  const [aviso, setAviso] = useState(false)
  const [completa, setCompleta] = useState(false)

  // Rótulo de la sala al entrar (en la fase 2 saltará al cambiar de sala).
  useEffect(() => {
    if (fase !== 'jugando') return
    setAviso(true)
    const t = setTimeout(() => setAviso(false), 3800)
    return () => clearTimeout(t)
  }, [fase])

  useEffect(() => {
    const f = () => setCompleta(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', f)
    return () => document.removeEventListener('fullscreenchange', f)
  }, [])

  if (fase !== 'jugando') return null

  const sala = salas?.[0]
  const foto = cercano ? salas?.find((s) => s.id === cercano.salaId)?.fotos[cercano.indice] : undefined

  return (
    <div className="hud">
      {sala && (
        <div className={`hud-aviso ${aviso ? 'visible' : ''}`} aria-live="polite">
          <small>Sala</small>
          <strong>{sala.titulo}</strong>
          <span>{sala.subtitulo}</span>
        </div>
      )}

      <div className="hud-botones">
        <button className="boton-redondo" onClick={() => setAyuda((a) => !a)} aria-label="Controles">
          <IconoAyuda />
        </button>
        {pantallaCompletaDisponible() && (
          <button className="boton-redondo" onClick={alternarPantallaCompleta} aria-label="Pantalla completa">
            {completa ? <IconoSalirPantallaCompleta /> : <IconoPantallaCompleta />}
          </button>
        )}
      </div>

      {foto && cercano && !visor && (
        <button
          key={cercano.id}
          className={`hud-interactuar ${esTactil ? 'tactil' : ''}`}
          onClick={() => abrirVisor(cercano)}
        >
          <span className="icono">
            <IconoOjo />
          </span>
          <span className="textos">
            <span className="accion">Ver recuerdo</span>
            <span className="titulo">{foto.titulo}</span>
          </span>
          {!esTactil && <kbd>E</kbd>}
        </button>
      )}

      {ayuda && (
        <div className="hud-ayuda" role="dialog" aria-label="Controles">
          <button className="cerrar" onClick={() => setAyuda(false)} aria-label="Cerrar">
            <IconoCerrar />
          </button>
          <h3>Cómo moverse</h3>
          <ListaControles tactil={esTactil} />
        </div>
      )}
    </div>
  )
}
