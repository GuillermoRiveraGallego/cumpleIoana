import type { Disposicion } from './disposicion'
import { Sala } from './Sala'
import { Vestibulo } from './Vestibulo'
import { Visibilidad } from './Visibilidad'

/** El museo completo: vestíbulo central + una sala por año alrededor. */
export function Museo({ disposicion }: { disposicion: Disposicion }) {
  return (
    <>
      <Vestibulo disposicion={disposicion} />
      {disposicion.salas.map((espacio) => (
        <Sala key={espacio.sala.id} espacio={espacio} />
      ))}
      <Visibilidad />
    </>
  )
}
