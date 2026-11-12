import { useEffect, useRef, useState } from 'react'
import { CUMPLE, TITULO_MUSEO } from '../config'
import { useEstado } from '../estado'
import { lemaMuseo } from '../galeria/datos'
import { ID_FIESTA, ID_VESTIBULO } from '../mundo/espacios'
import { ListaControles } from './Ayuda'
import {
  IconoAyuda,
  IconoCerrar,
  IconoOjo,
  IconoPantallaCompleta,
  IconoSalirPantallaCompleta,
  IconoTarta,
} from './Iconos'
import { alternarPantallaCompleta, pantallaCompletaDisponible } from './pantallaCompleta'

interface Aviso {
  antetitulo: string
  titulo: string
  subtitulo: string
}

/**
 * Interfaz durante el paseo: nombre de la sala, botón "Ver recuerdo" (o "Soplar las velas" junto a la
 * tarta), ayuda y pantalla completa.
 */
export function Hud() {
  const fase = useEstado((s) => s.fase)
  const salas = useEstado((s) => s.salas)
  const cercano = useEstado((s) => s.cercano)
  const visor = useEstado((s) => s.visor)
  const esTactil = useEstado((s) => s.esTactil)
  const abrirVisor = useEstado((s) => s.abrirVisor)
  const espacioActual = useEstado((s) => s.espacioActual)
  const velas = useEstado((s) => s.velas)
  const cercaTarta = useEstado((s) => s.cercaTarta)
  const usarTarta = useEstado((s) => s.usarTarta)
  const [ayuda, setAyuda] = useState(false)
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const [avisoVisible, setAvisoVisible] = useState(false)
  const [completa, setCompleta] = useState(false)
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined)
  // Tras apagar las velas, el botón de volver a encenderlas tarda un poco (que no tape la celebración).
  const [puedeEncender, setPuedeEncender] = useState(true)

  const mostrarAviso = (a: Aviso, ms: number) => {
    setAviso(a)
    setAvisoVisible(true)
    clearTimeout(temporizador.current)
    temporizador.current = setTimeout(() => setAvisoVisible(false), ms)
  }
  useEffect(() => () => clearTimeout(temporizador.current), [])

  // Rótulo al entrar en el museo y cada vez que Ioana cambia de sala.
  useEffect(() => {
    if (fase !== 'jugando' || !espacioActual) return
    const salas = useEstado.getState().salas ?? []
    const sala = salas.find((s) => s.id === espacioActual)
    if (espacioActual === ID_VESTIBULO) {
      mostrarAviso({ antetitulo: 'Bienvenida', titulo: TITULO_MUSEO, subtitulo: lemaMuseo(salas.length) }, 3800)
    } else if (espacioActual === ID_FIESTA) {
      mostrarAviso({ antetitulo: 'Sorpresa', titulo: CUMPLE.titulo, subtitulo: 'Acércate a la tarta y sopla las velas' }, 4500)
    } else if (sala) {
      mostrarAviso({ antetitulo: 'Sala', titulo: sala.titulo, subtitulo: sala.subtitulo }, 3800)
    }
  }, [fase, espacioActual])

  // Al apagar todas las velas.
  useEffect(() => {
    if (velas !== 'apagadas') return
    mostrarAviso(
      { antetitulo: '¡Sorpresa!', titulo: `¡Feliz cumpleaños, ${CUMPLE.nombre}!`, subtitulo: CUMPLE.felicitacion },
      7000,
    )
    setPuedeEncender(false)
    const t = setTimeout(() => setPuedeEncender(true), 7000)
    return () => {
      clearTimeout(t)
      setPuedeEncender(true)
    }
  }, [velas])

  useEffect(() => {
    const f = () => setCompleta(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', f)
    return () => document.removeEventListener('fullscreenchange', f)
  }, [])

  if (fase !== 'jugando') return null

  const foto = cercano ? salas?.find((s) => s.id === cercano.salaId)?.fotos[cercano.indice] : undefined
  const soplando = velas === 'soplando'

  return (
    <div className="hud">
      {aviso && (
        <div className={`hud-aviso ${avisoVisible && !soplando ? 'visible' : ''}`} aria-live="polite">
          <small>{aviso.antetitulo}</small>
          <strong>{aviso.titulo}</strong>
          <span>{aviso.subtitulo}</span>
        </div>
      )}

      <div className={`hud-botones ${soplando ? 'oculto' : ''}`}>
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

      {!foto && cercaTarta && !soplando && !visor && (velas === 'encendidas' || puedeEncender) && (
        <button key={`tarta-${velas}`} className={`hud-interactuar ${esTactil ? 'tactil' : ''}`} onClick={usarTarta}>
          <span className="icono">
            <IconoTarta />
          </span>
          <span className="textos">
            <span className="accion">{velas === 'encendidas' ? 'Soplar las velas' : 'Volver a encenderlas'}</span>
            <span className="titulo">{velas === 'encendidas' ? 'Pide un deseo' : 'Para soplar otra vez'}</span>
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
