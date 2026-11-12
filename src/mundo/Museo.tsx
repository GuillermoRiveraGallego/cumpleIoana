import type { Disposicion } from './disposicion'
import { SalaFiesta } from './fiesta/SalaFiesta'
import { Sala } from './Sala'
import { Vestibulo } from './Vestibulo'
import { Visibilidad } from './Visibilidad'

/** El museo completo: vestíbulo central + una sala por año alrededor + la sala del cumpleaños. */
export function Museo({ disposicion }: { disposicion: Disposicion }) {
  return (
    <>
      <Vestibulo disposicion={disposicion} />
      {disposicion.salas.map((espacio) => (
        <Sala key={espacio.sala.id} espacio={espacio} />
      ))}
      {disposicion.fiesta && <SalaFiesta espacio={disposicion.fiesta} />}
      <Visibilidad />
    </>
  )
}
