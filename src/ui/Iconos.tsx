// Iconos SVG en línea (sin dependencias).
const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export const IconoCerrar = () => (
  <svg {...base}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)
export const IconoAnterior = () => (
  <svg {...base}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
)
export const IconoSiguiente = () => (
  <svg {...base}>
    <path d="M9 5l7 7-7 7" />
  </svg>
)
export const IconoOjo = () => (
  <svg {...base}>
    <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)
export const IconoAyuda = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M9.6 9.3a2.5 2.5 0 014.8.9c0 1.7-2.4 2.2-2.4 3.6M12 17.2h.01" />
  </svg>
)
export const IconoPantallaCompleta = () => (
  <svg {...base}>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </svg>
)
export const IconoSalirPantallaCompleta = () => (
  <svg {...base}>
    <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
  </svg>
)
export const IconoCorazon = () => (
  <svg {...base} fill="currentColor" stroke="none">
    <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8.1 3.6 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.6 0 5.7 3.6 4.5 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" />
  </svg>
)
export const IconoTarta = () => (
  <svg {...base}>
    <path d="M3.5 21h17M5 21v-6.5a1.5 1.5 0 011.5-1.5h11a1.5 1.5 0 011.5 1.5V21" />
    <path d="M5 16.6c1.2 0 1.6-1.1 2.8-1.1s1.6 1.1 2.8 1.1 1.6-1.1 2.8-1.1 1.6 1.1 2.8 1.1 1.6-1.1 2.8-1.1" />
    <path d="M12 13V9.5" />
    <path d="M12 7c1-.8 1-2 0-3.3-1 1.3-1 2.5 0 3.3z" fill="currentColor" />
  </svg>
)
export const IconoMicro = () => (
  <svg {...base}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21M8.5 21h7" />
  </svg>
)
export const IconoViento = () => (
  <svg {...base}>
    <path d="M3 8h10a3 3 0 10-3-3M3 12h15a3 3 0 11-3 3M3 16h7" />
  </svg>
)
