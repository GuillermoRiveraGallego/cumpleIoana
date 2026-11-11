import { create } from 'zustand'
import { ES_TACTIL } from './config'
import type { Sala } from './galeria/datos'

export interface RefCuadro {
  id: string
  salaId: string
  indice: number
}

type Fase = 'intro' | 'jugando'

interface Estado {
  fase: Fase
  salas: Sala[] | null
  escenaLista: boolean
  esTactil: boolean
  /** Cuadro al que estás lo bastante cerca como para verlo. */
  cercano: RefCuadro | null
  /** Cuadro abierto en la vista ampliada. */
  visor: RefCuadro | null
  /** Dónde está Ioana: 'vestibulo' o el id de una sala ('sala-2022'...). */
  espacioActual: string | null

  setSalas: (salas: Sala[]) => void
  setEscenaLista: () => void
  setTactil: () => void
  entrar: () => void
  setCercano: (c: RefCuadro | null) => void
  abrirVisor: (c: RefCuadro) => void
  cerrarVisor: () => void
  moverVisor: (delta: number) => void
  setEspacioActual: (id: string) => void
}

export const useEstado = create<Estado>()((set, get) => ({
  fase: 'intro',
  salas: null,
  escenaLista: false,
  esTactil: ES_TACTIL,
  cercano: null,
  visor: null,
  espacioActual: null,

  setSalas: (salas) => set({ salas }),
  setEscenaLista: () => set({ escenaLista: true }),
  setTactil: () => set({ esTactil: true }),
  entrar: () => set({ fase: 'jugando' }),
  setCercano: (cercano) => set({ cercano }),
  abrirVisor: (visor) => set({ visor }),
  cerrarVisor: () => set({ visor: null }),
  moverVisor: (delta) => {
    const { visor, salas } = get()
    const sala = salas?.find((s) => s.id === visor?.salaId)
    if (!visor || !sala) return
    const n = sala.fotos.length
    const indice = (visor.indice + delta + n) % n
    set({ visor: { id: sala.fotos[indice].id, salaId: sala.id, indice } })
  },
  setEspacioActual: (espacioActual) => set({ espacioActual }),
}))

/** ¿Deben ignorarse los controles de movimiento/cámara? */
export const controlesBloqueados = () => {
  const s = useEstado.getState()
  return s.fase !== 'jugando' || s.visor !== null
}
