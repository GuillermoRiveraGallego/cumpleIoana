import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { procesarFotos } from './scripts/procesar-fotos.mjs'

/**
 * Convierte las fotos de /imagenes en versiones optimizadas (public/galeria) al arrancar,
 * y en desarrollo vuelve a hacerlo y recarga la página cuando añades, cambias o borras fotos.
 */
function galeriaFotos(): Plugin {
  let raiz = process.cwd()
  let cola: Promise<unknown> = Promise.resolve()
  const log = (m: string) => console.log(`\x1b[35m[galería]\x1b[0m ${m}`)
  const procesar = () => {
    cola = cola
      .then(() => procesarFotos({ raiz, log }))
      .catch((e: unknown) => console.error('[galería]', e))
    return cola
  }

  return {
    name: 'galeria-fotos',
    configResolved(config) {
      raiz = config.root
    },
    async buildStart() {
      await procesar()
    },
    configureServer(server) {
      const dir = path.join(raiz, 'imagenes').toLowerCase()
      server.watcher.add(path.join(raiz, 'imagenes'))
      let espera: ReturnType<typeof setTimeout> | undefined
      const alCambiar = (archivo: string) => {
        if (!path.resolve(archivo).toLowerCase().startsWith(dir)) return
        clearTimeout(espera)
        espera = setTimeout(() => {
          procesar().then(() => server.ws.send({ type: 'full-reload' }))
        }, 500)
      }
      for (const evento of ['add', 'change', 'unlink', 'addDir', 'unlinkDir'] as const) {
        server.watcher.on(evento, alCambiar)
      }
    },
  }
}

export default defineConfig({
  // Rutas relativas: funciona igual en la raíz de un dominio o en una subcarpeta (GitHub Pages...).
  base: './',
  plugins: [react(), galeriaFotos()],
  build: {
    chunkSizeWarningLimit: 1600,
  },
})
