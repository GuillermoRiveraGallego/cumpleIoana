export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/** Amortiguación independiente del framerate. k ≈ "velocidad" (1/s). */
export const damp = (actual: number, objetivo: number, k: number, dt: number) =>
  actual + (objetivo - actual) * (1 - Math.exp(-k * dt))

const DOS_PI = Math.PI * 2

/** a − b, envuelto en [−π, π]. */
export function difAngulo(a: number, b: number) {
  let d = (a - b) % DOS_PI
  if (d > Math.PI) d -= DOS_PI
  if (d < -Math.PI) d += DOS_PI
  return d
}

export const dampAngulo = (actual: number, objetivo: number, k: number, dt: number) =>
  actual + difAngulo(objetivo, actual) * (1 - Math.exp(-k * dt))

/** Generador pseudoaleatorio con semilla (mulberry32): las texturas salen siempre iguales. */
export function aleatorio(semilla: number) {
  let a = semilla >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
