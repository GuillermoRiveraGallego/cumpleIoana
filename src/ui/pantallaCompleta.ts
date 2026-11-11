export const pantallaCompletaDisponible = () => typeof document !== 'undefined' && !!document.fullscreenEnabled

export function pedirPantallaCompleta() {
  if (!pantallaCompletaDisponible() || document.fullscreenElement) return
  document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }).catch(() => {})
}

export function alternarPantallaCompleta() {
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
  else pedirPantallaCompleta()
}
