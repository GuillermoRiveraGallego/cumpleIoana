import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { useEstado } from './estado'
import './styles.css'

// Solo en desarrollo: acceso al estado desde la consola del navegador (window.__museo.getState()).
if (import.meta.env.DEV) Object.assign(window, { __museo: useEstado })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
