// Copia el decodificador Draco de three.js a public/draco para no depender de un CDN externo.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const origen = path.join(raiz, 'node_modules', 'three', 'examples', 'jsm', 'libs', 'draco', 'gltf')
const destino = path.join(raiz, 'public', 'draco')

if (!fs.existsSync(origen)) {
  console.warn('[draco] No se encontró el decodificador dentro de three; se omitirá la copia.')
  process.exit(0)
}
fs.mkdirSync(destino, { recursive: true })
for (const archivo of fs.readdirSync(origen)) {
  fs.copyFileSync(path.join(origen, archivo), path.join(destino, archivo))
}
console.log('[draco] Decodificador copiado a public/draco')
