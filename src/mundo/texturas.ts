import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'
import { aleatorio } from '../util/matematicas'

// Texturas procedurales dibujadas en <canvas>: cero descargas extra y tamaño controlado para móvil.

export const SERIF = '"Cormorant Garamond", Georgia, "Times New Roman", serif'
export const SANS = 'Nunito, "Segoe UI", system-ui, sans-serif'

function lienzo(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return { c, ctx: c.getContext('2d')! }
}

function aTextura(c: HTMLCanvasElement, repetir = false) {
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  if (repetir) t.wrapS = t.wrapT = RepeatWrapping
  return t
}

function espaciado(ctx: CanvasRenderingContext2D, px: number) {
  if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${px}px`
}

/** Ajusta el tamaño de letra para que el texto quepa en `ancho` y lo recorta con "…" si aun así no cabe. */
function textoAjustado(
  ctx: CanvasRenderingContext2D,
  texto: string,
  x: number,
  y: number,
  ancho: number,
  fuente: (px: number) => string,
  maxPx: number,
  minPx: number,
) {
  let px = maxPx
  ctx.font = fuente(px)
  while (px > minPx && ctx.measureText(texto).width > ancho) ctx.font = fuente(--px)
  let t = texto
  while (t.length > 1 && ctx.measureText(t).width > ancho) t = t.slice(0, -2) + '…'
  ctx.fillText(t, x, y)
}

// ───────────────────────────── Suelo de madera ─────────────────────────────

function tabla(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, semilla: number) {
  const r = aleatorio(semilla)
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  ctx.fillStyle = color
  ctx.fillRect(x, y, w, h)
  for (let i = 0; i < 10; i++) {
    const yy = y + r() * h
    const amp = 1.5 + r() * 5
    const frec = 0.004 + r() * 0.012
    const fase = r() * 6
    ctx.strokeStyle = r() < 0.6 ? `rgba(70,38,18,${0.07 + r() * 0.09})` : `rgba(255,228,190,${0.05 + r() * 0.06})`
    ctx.lineWidth = 1 + r() * 2.5
    ctx.beginPath()
    for (let xx = x; xx <= x + w + 12; xx += 12) {
      const yv = yy + Math.sin(xx * frec + fase) * amp
      if (xx === x) ctx.moveTo(xx, yv)
      else ctx.lineTo(xx, yv)
    }
    ctx.stroke()
  }
  const g = ctx.createLinearGradient(x, 0, x + w, 0)
  g.addColorStop(0, 'rgba(0,0,0,0.07)')
  g.addColorStop(0.5, 'rgba(255,255,255,0.03)')
  g.addColorStop(1, 'rgba(0,0,0,0.09)')
  ctx.fillStyle = g
  ctx.fillRect(x, y, w, h)
  ctx.restore()
  ctx.strokeStyle = 'rgba(48,28,16,0.6)'
  ctx.lineWidth = 2
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2)
}

/** Parquet de tablas de roble cálido. Repetible. */
export function texturaParquet() {
  const S = 1024
  const filas = 8
  const alto = S / filas
  const { c, ctx } = lienzo(S, S)
  const r = aleatorio(11)
  for (let f = 0; f < filas; f++) {
    const y = f * alto
    let x = -r() * 400
    while (x < S) {
      const largo = 280 + r() * 380
      const color = `hsl(${24 + r() * 8}, ${30 + r() * 12}%, ${37 + r() * 12}%)`
      const semilla = Math.floor(r() * 1e9)
      tabla(ctx, x, y, largo, alto, color, semilla)
      // Para que la textura se repita sin costuras, lo que sale por un lado entra por el otro.
      if (x < 0) tabla(ctx, x + S, y, largo, alto, color, semilla)
      if (x + largo > S) tabla(ctx, x - S, y, largo, alto, color, semilla)
      x += largo
    }
  }
  return aTextura(c, true)
}

// ───────────────────────────── Alfombra ─────────────────────────────

export function texturaAlfombra([fondo, adorno, borde]: [string, string, string]) {
  const W = 512
  const H = 880
  const { c, ctx } = lienzo(W, H)
  const r = aleatorio(5)
  ctx.fillStyle = fondo
  ctx.fillRect(0, 0, W, H)
  // Grano textil
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)'
    ctx.fillRect(r() * W, r() * H, 2, 2)
  }
  ctx.strokeStyle = borde
  ctx.lineWidth = 34
  ctx.strokeRect(17, 17, W - 34, H - 34)
  ctx.strokeStyle = adorno
  ctx.lineWidth = 5
  ctx.strokeRect(46, 46, W - 92, H - 92)
  ctx.lineWidth = 2
  ctx.strokeRect(58, 58, W - 116, H - 116)
  // Rombos centrales
  ctx.fillStyle = adorno
  ctx.globalAlpha = 0.85
  const rombo = (cx: number, cy: number, w: number, h: number) => {
    ctx.beginPath()
    ctx.moveTo(cx, cy - h)
    ctx.lineTo(cx + w, cy)
    ctx.lineTo(cx, cy + h)
    ctx.lineTo(cx - w, cy)
    ctx.closePath()
  }
  rombo(W / 2, H / 2, 120, 200)
  ctx.lineWidth = 6
  ctx.strokeStyle = adorno
  ctx.stroke()
  rombo(W / 2, H / 2, 60, 100)
  ctx.fill()
  for (const dy of [-300, 300]) {
    rombo(W / 2, H / 2 + dy, 34, 48)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  return aTextura(c)
}

// ───────────────────────────── Degradados ─────────────────────────────

let degradadoRadial: CanvasTexture | null = null
/** Mancha radial blanca → transparente (sombra del personaje, haces de luz en la pared). Compartida. */
export function texturaDegradadoRadial() {
  if (degradadoRadial) return degradadoRadial
  const { c, ctx } = lienzo(128, 128)
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.45, 'rgba(255,255,255,0.5)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  degradadoRadial = aTextura(c)
  return degradadoRadial
}

let degradadoVertical: CanvasTexture | null = null
/** Brillo que sube desde la tira LED hacia el techo. Compartida. */
export function texturaDegradadoVertical() {
  if (degradadoVertical) return degradadoVertical
  const { c, ctx } = lienzo(4, 64)
  const g = ctx.createLinearGradient(0, 64, 0, 0)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, 'rgba(255,255,255,0.45)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 4, 64)
  degradadoVertical = aTextura(c)
  return degradadoVertical
}

// ───────────────────────────── Claraboya ─────────────────────────────

export function texturaClaraboya() {
  const { c, ctx } = lienzo(256, 400)
  const g = ctx.createRadialGradient(128, 200, 20, 128, 200, 260)
  g.addColorStop(0, '#fffaf0')
  g.addColorStop(1, '#f6e4c8')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 400)
  ctx.strokeStyle = '#cbbba6'
  ctx.lineWidth = 6
  for (const x of [256 / 2]) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, 400)
    ctx.stroke()
  }
  for (const y of [400 / 3, (400 * 2) / 3]) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(256, y)
    ctx.stroke()
  }
  ctx.lineWidth = 10
  ctx.strokeRect(0, 0, 256, 400)
  return aTextura(c)
}

// ───────────────────────────── Cuadros provisionales ─────────────────────────────

function corazon(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  ctx.beginPath()
  ctx.moveTo(cx, cy + s * 0.4)
  ctx.bezierCurveTo(cx - s * 1.05, cy - s * 0.25, cx - s * 0.5, cy - s * 1.0, cx, cy - s * 0.45)
  ctx.bezierCurveTo(cx + s * 0.5, cy - s * 1.0, cx + s * 1.05, cy - s * 0.25, cx, cy + s * 0.4)
  ctx.fill()
}

/** Ilustración cálida para los huecos sin foto todavía. `conTexto=false` → solo fondo (mientras carga una foto real). */
export function texturaProvisional(
  indice: number,
  anio: number,
  aspecto: number,
  [claro, oscuro]: [string, string],
  conTexto = true,
) {
  const L = 512
  const W = aspecto >= 1 ? L : Math.round(L * aspecto)
  const H = aspecto >= 1 ? Math.round(L / aspecto) : L
  const { c, ctx } = lienzo(W, H)
  const r = aleatorio(anio * 97 + indice * 13 + 1)

  const g = ctx.createLinearGradient(0, 0, W * (0.6 + r() * 0.4), H)
  g.addColorStop(0, claro)
  g.addColorStop(1, oscuro)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  // Bokeh suave
  for (let i = 0; i < 14; i++) {
    const rad = 20 + r() * 90
    const x = r() * W
    const y = r() * H
    const b = ctx.createRadialGradient(x, y, 0, x, y, rad)
    b.addColorStop(0, `rgba(255,248,235,${0.12 + r() * 0.18})`)
    b.addColorStop(1, 'rgba(255,248,235,0)')
    ctx.fillStyle = b
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2)
  }

  if (conTexto) {
    const m = Math.min(W, H)
    ctx.fillStyle = 'rgba(255,250,244,0.92)'
    corazon(ctx, W / 2, H * 0.4, m * 0.12)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(255,252,248,0.96)'
    ctx.font = `600 ${Math.round(m * 0.13)}px ${SERIF}`
    ctx.fillText(`Recuerdo ${indice + 1}`, W / 2, H * 0.6)
    espaciado(ctx, Math.round(m * 0.012))
    ctx.font = `700 ${Math.round(m * 0.045)}px ${SANS}`
    ctx.fillStyle = 'rgba(255,252,248,0.75)'
    ctx.fillText(`AÑO ${anio}`, W / 2, H * 0.72)
  }
  return aTextura(c)
}

// ───────────────────────────── Textos ─────────────────────────────

/** Cartela del cuadro (título + fecha). */
export function texturaPlaca(titulo: string, linea2: string) {
  const W = 512
  const H = 150
  const { c, ctx } = lienzo(W, H)
  ctx.fillStyle = '#f4ede2'
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = 'rgba(60,40,25,0.18)'
  ctx.lineWidth = 3
  ctx.strokeRect(1.5, 1.5, W - 3, H - 3)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#2d2019'
  textoAjustado(ctx, titulo, W / 2, linea2 ? 58 : H / 2, W - 50, (px) => `600 ${px}px ${SERIF}`, 50, 30)
  if (linea2) {
    ctx.fillStyle = '#7a6656'
    textoAjustado(ctx, linea2, W / 2, 108, W - 60, (px) => `italic 500 ${px}px ${SERIF}`, 32, 22)
  }
  return aTextura(c)
}

/** Rótulo grande de la sala pintado en la pared. */
export function texturaTituloSala(titulo: string, subtitulo: string, color: string) {
  const W = 2048
  const H = 560
  const { c, ctx } = lienzo(W, H)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = color
  textoAjustado(ctx, titulo, W / 2, 280, W - 120, (px) => `600 ${px}px ${SERIF}`, 250, 120)
  if (subtitulo) {
    ctx.font = `italic 500 86px ${SERIF}`
    ctx.globalAlpha = 0.9
    ctx.fillText(subtitulo, W / 2, 420)
    const w = Math.min(ctx.measureText(subtitulo).width, W - 600)
    ctx.globalAlpha = 0.55
    ctx.fillRect(W / 2 - w / 2 - 230, 392, 180, 3)
    ctx.fillRect(W / 2 + w / 2 + 50, 392, 180, 3)
  }
  return aTextura(c)
}

/** Placa de latón (p. ej. junto a la puerta). */
export function texturaCartel(titulo: string, linea2: string) {
  const W = 512
  const H = 220
  const { c, ctx } = lienzo(W, H)
  const g = ctx.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, '#b8925a')
  g.addColorStop(0.5, '#d9b77e')
  g.addColorStop(1, '#a37d48')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = 'rgba(60,35,10,0.45)'
  ctx.lineWidth = 4
  ctx.strokeRect(14, 14, W - 28, H - 28)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#3a2410'
  ctx.font = `700 64px ${SERIF}`
  ctx.fillText(titulo, W / 2, 92)
  espaciado(ctx, 5)
  ctx.font = `800 26px ${SANS}`
  ctx.fillStyle = 'rgba(58,36,16,0.8)'
  ctx.fillText(linea2.toUpperCase(), W / 2, 158)
  return aTextura(c)
}
