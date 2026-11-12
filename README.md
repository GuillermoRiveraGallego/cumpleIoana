# Museo de nuestros recuerdos

Web 3D tipo videojuego (React + Three.js + React Three Fiber) para pasear con Ioana por un museo de
nuestros recuerdos. Está pensada sobre todo para móvil.

**Estado: fase 2 (museo completo).** Hay un vestíbulo en forma de galería, una sala por cada carpeta de
`imagenes/` (ahora cinco, de 2022 a 2026) y una sala sorpresa de cumpleaños con una tarta. Ya funcionan el
personaje, la cámara en tercera persona, los controles táctiles y de teclado/ratón, las colisiones y la vista
ampliada de las fotos.

```
                       ┌────────┐
                       │  2024  │
                       └──┐  ┌──┘
         ┌────────┐ ┌─────┘  └─────┐ ┌────────┐
         │  2023  ├─┤              ├─┤  2025  │
         └────────┘ │  Vestíbulo   │ └────────┘
         ┌────────┐ │      ♥       │ ┌────────┐
         │  2022  ├─┤              ├─┤  2026  │
         └────────┘ └───── ▲ ──────┘ └────────┘
                       ┌──┘  └──┐
                       │ Fiesta │  ← sala del cumpleaños (siempre abierta)
                       └────────┘
```

Empiezas junto a la entrada, donde están la puerta principal y el título del museo, mirando a la galería. El
recorrido va por la izquierda hacia el fondo y vuelve por la derecha. Sobre cada puerta hay un cartel con el año y,
al lado, una placa con cuántos recuerdos tiene la sala. Con más o menos años, la galería se alarga o se acorta
sola. La puerta principal, a tu espalda al empezar, está abierta de par en par y lleva a la sala del cumpleaños.

## Sala del cumpleaños

Banderines, bombillas, globos, regalos y una mesa con una tarta de dos pisos con velas encendidas. Al acercarte
aparece **«Soplar las velas»** (o pulsa E, o toca la tarta):

1. Sale el panel «Pide un deseo…». Con **«Soplar al micrófono»**, el navegador pide permiso para usar el micro y
   basta con soplar al móvil. Cada vela aguanta un poco distinto, así que un soplido corto apaga solo algunas.
   El medidor muestra la fuerza del soplido y la raya marca a partir de dónde cuenta.
2. Sin micrófono (o si no da permiso), se sopla **manteniendo pulsado** el botón, o la barra espaciadora en el
   ordenador.
3. Al apagarlas todas cae confeti, sale «¡Feliz cumpleaños, Ioana!» y, al rato, se pueden volver a encender.

El micrófono solo funciona con **HTTPS** (GitHub Pages lo es) o en `localhost`. Si abres `npm run dev` desde el
móvil por la IP de la wifi (`http://192.168…`), el navegador no deja usar el micro y solo sale el botón.

Se ajusta en `CUMPLE`, en `src/config.ts`: el nombre, el **número de velas** (hasta 36), los textos del rótulo y de
la felicitación, y `umbralSoplidoDb` (bájalo, p. ej. a −36, si cuesta apagarlas; súbelo si se apagan solas al
hablar). Con `activa: false` vuelve la puerta principal cerrada y desaparece la sala.

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

1. **Cada subcarpeta de `imagenes/` es una sala**, en orden de nombre (`2022`, `2023`…). Para añadir un año, crea
   su carpeta; las que empiezan por `_` (p. ej. `_descartes`) se ignoran. Valen JPG, PNG, WebP, AVIF o TIFF. Las
   HEIC del iPhone no se pueden leer: expórtalas antes como JPG.
2. Ya está. Con `npm run dev` abierto se procesan solas y la página se recarga. Si no está abierto, se procesan
   al arrancar o al hacer `npm run build`. También puedes lanzarlo a mano con `npm run fotos`.
3. **Orden:** el de `info.json` (ver abajo) o, si no aparecen ahí, el alfabético. Puedes usar prefijos `01_`, `02_`…
4. **Cantidad:** hay tantos cuadros como fotos. Si caben, la sala mide 10 × 12 m; si hay más, se alarga sola
   (unos 2,5 m de pared por cuadro) y añade bancos y claraboyas. Una sala que aún no tiene ninguna foto muestra
   6 cuadros provisionales. Cada cuadro toma la proporción de su foto (vertical, horizontal o cuadrada), y las
   fotos de móvil giradas se enderezan solas (EXIF).

### Títulos y descripciones: `info.json`

Cada carpeta puede tener un `info.json` (los de 2022 a 2026 ya están creados con la lista de sus fotos, listos
para rellenar). Las claves de `fotos` son los nombres de archivo, con o sin extensión:

```json
{
  "titulo": "2022",
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

Todo es opcional: una foto sin título sale como «Recuerdo N». Sin `titulo`, la sala se llama como su carpeta, y
sin `subtitulo` se usa «Nuestro primer año», «Nuestro segundo año»… según el orden. Ambos aparecen en la pared del
fondo de la sala y en el cartel de su puerta en el vestíbulo.

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
| Soplar velas    | «Soplar las velas» o tocar la tarta, y soplar al micro | E o clic en la tarta · Espacio = soplar |
| En la foto      | Deslizar a los lados · ✕ para cerrar                   | ← → para pasar · Esc para cerrar        |

Puedes caminar y girar la cámara a la vez. El movimiento es relativo a la cámara, y si caminas sin tocarla, se
recoloca poco a poco detrás de Ioana.

## Estructura

```
imagenes/2022…2026/    ← una carpeta por sala: tus fotos + info.json (lo único que hay que tocar)
model/                 ← modelos de Ioana (se usa ioana_web_draco.glb)
scripts/
  procesar-fotos.mjs   ← redimensiona fotos → public/galeria + manifest.json (también es plugin de Vite)
  copiar-draco.mjs     ← copia el decodificador Draco (postinstall)
src/
  config.ts            ← TODOS los ajustes: velocidades, cámara, tamaños de sala, colores por año…
  estado.ts            ← estado global (zustand): fase, cuadro cercano, visor abierto
  App.tsx              ← Canvas + escena + capas de interfaz
  entrada/             ← teclado, joystick virtual, giro de cámara por punteros (multitáctil) y micrófono (soplido)
  jugador/             ← Ioana (movimiento, colisión, animación procedural) y cámara en 3ª persona
  mundo/
    disposicion.ts     ← planta del museo: galería según el nº de salas, tamaño de cada sala y sus cuadros
    Museo.tsx          ← vestíbulo + una sala por carpeta
    Vestibulo.tsx, Sala.tsx, Cuadro.tsx, Decoracion.tsx
    espacios.ts        ← en qué sala estás y qué salas se dibujan (portal culling)
    colisiones.ts, texturas.ts, geometrias.ts, Iluminacion.tsx
    fiesta/            ← sala del cumpleaños: tarta y velas, confeti, globos y banderines
  galeria/datos.ts     ← lee el manifest y rellena con cuadros provisionales
  ui/                  ← portada, HUD, visor de fotos, panel de soplar las velas
```

## Decisiones para que vaya fluido en móvil

- **Colisiones propias con cajas (AABB):** el jugador es un círculo que se desliza por las paredes, y la cámara
  lanza un rayo para no atravesar paredes, suelo ni techo. No hay motor de físicas ni WASM.
- **Luz barata:** un mapa de entorno generado una sola vez, una luz hemisférica y una direccional, sin sombras reales.
  Los «focos» de cada cuadro son planos aditivos con degradado, y la sombra de Ioana es un degradado bajo los pies.
- **Resolución adaptativa:** como máximo 1.5× en móvil, y baja a 1× si el rendimiento cae (`PerformanceMonitor`).
- **Personaje:** en móvil, sus materiales «físicos» (sheen/specular) se cambian por estándar, que son más baratos.
- **Texturas procedurales** (parquet, alfombra, rótulos, cartelas) dibujadas en canvas: no hay descargas extra.
- **Solo se dibuja lo que puede verse.** Cada sala es una caja cerrada cuya única abertura es la puerta. Si su puerta
  no se ve (desde una sala, a través de la puerta de esa sala), la sala no se dibuja (portal culling).
- **Fotos bajo demanda:** las fotos de una sala se descargan la primera vez que la ves.
- **Pocas llamadas de dibujo:** las paredes, zócalos y molduras de cada espacio están fusionadas en una sola malla,
  igual que los marcos, focos, bancos y plantas. Unas 40-70 llamadas por sala y unas 100 en el vestíbulo
  (incluidas las ~26 del personaje).
- **Texturas y geometrías compartidas**, y el render se **pausa** mientras la foto ampliada está abierta (ahorra batería).

## Sobre el modelo de Ioana

`ioana_web_draco.glb` no tiene esqueleto ni animaciones, pero está dividido en piezas (brazos con pivote en el
hombro, cuerpo y cabeza). Por eso el paso de andar (rebote, balanceo, brazos) y la respiración en reposo se animan
por código. Si más adelante se riggea, por ejemplo con Mixamo, se podrán usar animaciones reales de piernas.

## Hoja de ruta

- [x] **Fase 1 — Prototipo:** personaje, una sala, cámara, controles, colisiones e interacción con los cuadros.
- [x] **Fase 2 — Museo completo:** vestíbulo en galería con una sala por carpeta (las 5 de 2022 a 2026), tantos
      cuadros como fotos (las salas crecen solas), rótulo al cambiar de sala, carga de fotos por sala y dibujado
      solo de lo visible.
- [ ] **Fase 3 — Pulido:** música ambiente, versión más ligera del modelo de Ioana para móvil (hoy tiene ~764.000
      triángulos, con diferencia lo más pesado de la escena) y pruebas en dispositivos reales.
