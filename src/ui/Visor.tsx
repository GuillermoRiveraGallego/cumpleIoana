import { useRef, type PointerEvent as PE } from 'react'
import { temaDeSala } from '../config'
import { useEstado } from '../estado'
import { urlRecurso } from '../galeria/datos'
import { IconoAnterior, IconoCerrar, IconoCorazon, IconoSiguiente } from './Iconos'

/** Vista ampliada de un recuerdo: foto grande, título, fecha y descripción. Se navega entre los de la sala. */
export function Visor() {
  const visor = useEstado((s) => s.visor)
  const salas = useEstado((s) => s.salas)
  const cerrar = useEstado((s) => s.cerrarVisor)
  const mover = useEstado((s) => s.moverVisor)
  const deslizar = useRef<{ x: number; y: number } | null>(null)

  const sala = visor ? salas?.find((s) => s.id === visor.salaId) : undefined
  const foto = visor && sala ? sala.fotos[visor.indice] : undefined
  if (!visor || !sala || !foto) return null
  const tema = temaDeSala(sala.orden)

  // Deslizar a izquierda/derecha para pasar de foto en el móvil.
  const alPulsar = (e: PE) => {
    deslizar.current = { x: e.clientX, y: e.clientY }
  }
  const alSoltar = (e: PE) => {
    const d = deslizar.current
    deslizar.current = null
    if (!d) return
    const dx = e.clientX - d.x
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - d.y) * 1.3) mover(dx < 0 ? 1 : -1)
  }

  return (
    <div className="visor" onClick={cerrar} role="dialog" aria-modal="true" aria-label={foto.titulo}>
      <figure
        key={foto.id}
        className="visor-figura"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={alPulsar}
        onPointerUp={alSoltar}
      >
        <div className="visor-imagen">
          {foto.provisional || !foto.visor ? (
            <div
              className="visor-provisional"
              style={{
                aspectRatio: String(foto.aspecto),
                background: `linear-gradient(135deg, ${tema.provisional[0]}, ${tema.provisional[1]})`,
              }}
            >
              <IconoCorazon />
              <strong>{foto.titulo}</strong>
              <small>{sala.titulo}</small>
            </div>
          ) : (
            <img
              src={urlRecurso(foto.visor)}
              alt={foto.titulo}
              decoding="async"
              draggable={false}
              style={{
                aspectRatio: String(foto.aspecto),
                backgroundImage: foto.pared ? `url(${urlRecurso(foto.pared)})` : undefined,
              }}
            />
          )}
        </div>
        <figcaption>
          <p className="visor-sala">
            {sala.titulo} · {visor.indice + 1} / {sala.fotos.length}
          </p>
          <h2>{foto.titulo}</h2>
          {foto.fecha && <p className="visor-fecha">{foto.fecha}</p>}
          {foto.descripcion && <p className="visor-descripcion">{foto.descripcion}</p>}
        </figcaption>
      </figure>

      <button
        className="boton-redondo visor-cerrar"
        onClick={(e) => {
          e.stopPropagation()
          cerrar()
        }}
        aria-label="Cerrar"
      >
        <IconoCerrar />
      </button>
      <button
        className="boton-redondo visor-nav anterior"
        onClick={(e) => {
          e.stopPropagation()
          mover(-1)
        }}
        aria-label="Anterior"
      >
        <IconoAnterior />
      </button>
      <button
        className="boton-redondo visor-nav siguiente"
        onClick={(e) => {
          e.stopPropagation()
          mover(1)
        }}
        aria-label="Siguiente"
      >
        <IconoSiguiente />
      </button>
    </div>
  )
}
