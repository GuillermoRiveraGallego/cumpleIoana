# Museo de nuestros recuerdos

Web 3D tipo videojuego (React + Three.js + React Three Fiber) para pasear con Ioana por un museo de
nuestros recuerdos. Está pensada sobre todo para móvil.

**Estado: fase 1 (prototipo).** Incluye el personaje, una sala completa (año 1), la cámara en tercera persona,
los controles táctiles y de teclado/ratón, las colisiones y la vista ampliada de las fotos.

## Arrancar

```bash
npm install        # también copia el decodificador Draco a public/draco
npm run dev        # http://localhost:5173
npm run build      # genera /dist, listo para cualquier hosting estático (Netlify, Vercel, GitHub Pages…)
npm run preview    # sirve /dist para probar la versión final
```

`npm run dev` también muestra una URL de red (`Network: http://192.168.x.x:5173`). Ábrela en el móvil, conectado a
la misma wifi, para probar los controles táctiles.

## Añadir o cambiar fotos (sin tocar código)

1. Copia las fotos en `imagenes/año 1`, `imagenes/año 2`, `imagenes/año 3` o `imagenes/año 4`.
   Valen JPG, PNG, WebP, AVIF o TIFF. Las HEIC del iPhone no se pueden leer: expórtalas antes como JPG.
2. Ya está. Con `npm run dev` abierto se procesan solas y la página se recarga. Si no está abierto, se procesan
   al arrancar o al hacer `npm run build`. También puedes lanzarlo a mano con `npm run fotos`.
3. **Orden:** el de `info.json` (ver abajo) o, si no aparecen ahí, el alfabético. Puedes usar prefijos `01_`, `02_`…
4. **Cantidad:** si hay menos de 6 fotos, los huecos se rellenan con cuadros provisionales. Si hay más, se reparten
   por las paredes y los cuadros se hacen un poco más pequeños. Cada cuadro toma la proporción de su foto
   (vertical, horizontal o cuadrada), y las fotos de móvil giradas se enderezan solas (EXIF).

### Títulos y descripciones: `info.json`

Cada carpeta tiene un `info.json`. Las claves de `fotos` son los nombres de archivo, con o sin extensión:

```json
{
  "titulo": "Año 1",
  "subtitulo": "Donde empezó todo",
  "fotos": {
    "01_playa.jpg": {
      "titulo": "Nuestra primera playa",
      "fecha": "Agosto 2022",
      "descripcion": "Una o dos frases sobre este momento."
    },
    "cena": { "titulo": "La cena", "fecha": "Marzo 2022" }
  }
}
```

Todo es opcional: una foto que no esté en `info.json` sale como «Recuerdo N».

### Qué se genera

Las fotos originales no se suben a la web tal cual. Para cada una se generan dos versiones WebP en `public/galeria/`:
una de 640 px para la textura del cuadro (ligera para la GPU del móvil) y otra de 1600 px para la vista ampliada.
También se genera `manifest.json`, que es lo que lee la web. Esa carpeta se crea sola y está en `.gitignore`.

> Las fotos de `imagenes/` sí se suben al repositorio si haces commit. Si el repositorio es público, tenlo en cuenta.

## Controles

|                 | Móvil                                                  | Ordenador                               |
| --------------- | ------------------------------------------------------ | --------------------------------------- |
| Caminar         | Joystick abajo a la izquierda (aparece bajo el pulgar) | WASD o flechas (Shift para correr)      |
| Girar la cámara | Deslizar el dedo por cualquier otra zona               | Arrastrar con el ratón · rueda = zoom   |
| Ver un recuerdo | Botón «Ver recuerdo» o tocar el cuadro                 | E / Enter o clic en el cuadro           |
| En la foto      | Deslizar a los lados · ✕ para cerrar                   | ← → para pasar · Esc para cerrar        |

Puedes caminar y girar la cámara a la vez. El movimiento es relativo a la cámara, y si caminas sin tocarla, se
recoloca poco a poco detrás de Ioana.

## Estructura

```
imagenes/año N/        ← tus fotos + info.json (lo único que hay que tocar para el contenido)
model/                 ← modelos de Ioana (se usa ioana_web_draco.glb)
scripts/
  procesar-fotos.mjs   ← redimensiona fotos → public/galeria + manifest.json (también es plugin de Vite)
  copiar-draco.mjs     ← copia el decodificador Draco (postinstall)
src/
  config.ts            ← TODOS los ajustes: velocidades, cámara, tamaños de sala, colores por año…
  estado.ts            ← estado global (zustand): fase, cuadro cercano, visor abierto
  App.tsx              ← Canvas + escena + capas de interfaz
  entrada/             ← teclado, joystick virtual y giro de cámara por punteros (multitáctil)
  jugador/             ← Ioana (movimiento, colisión, animación procedural) y cámara en 3ª persona
  mundo/               ← Sala, Cuadro, decoración, iluminación, colisiones, texturas procedurales
  galeria/datos.ts     ← lee el manifest y rellena con cuadros provisionales
  ui/                  ← portada, HUD, visor de fotos
```

## Decisiones para que vaya fluido en móvil

- **Colisiones propias con cajas (AABB):** el jugador es un círculo que se desliza por las paredes, y la cámara
  lanza un rayo para no atravesar paredes, suelo ni techo. No hay motor de físicas ni WASM.
- **Luz barata:** un mapa de entorno generado una sola vez, una luz hemisférica y una direccional, sin sombras reales.
  Los «focos» de cada cuadro son planos aditivos con degradado, y la sombra de Ioana es un degradado bajo los pies.
- **Resolución adaptativa:** como máximo 1.5× en móvil, y baja a 1× si el rendimiento cae (`PerformanceMonitor`).
- **Personaje:** en móvil, sus materiales «físicos» (sheen/specular) se cambian por estándar, que son más baratos.
- **Texturas procedurales** (parquet, alfombra, rótulos, cartelas) dibujadas en canvas: no hay descargas extra.
- **Geometrías compartidas**, y el render se **pausa** mientras la foto ampliada está abierta (ahorra batería).

## Sobre el modelo de Ioana

`ioana_web_draco.glb` no tiene esqueleto ni animaciones, pero está dividido en piezas (brazos con pivote en el
hombro, cuerpo y cabeza). Por eso el paso de andar (rebote, balanceo, brazos) y la respiración en reposo se animan
por código. Si más adelante se riggea, por ejemplo con Mixamo, se podrán usar animaciones reales de piernas.

## Hoja de ruta

- [x] **Fase 1 — Prototipo:** personaje, una sala, cámara, controles, colisiones e interacción con los cuadros.
- [ ] **Fase 2 — Museo completo:** vestíbulo central con las 4 salas alrededor. `Sala` ya acepta posición y giro,
      y el hueco de la puerta existe: la puerta cerrada es provisional. Rótulo al cambiar de sala y carga de
      texturas por sala.
- [ ] **Fase 3 — Pulido:** música ambiente, detalles del vestíbulo, pruebas en dispositivos reales.
