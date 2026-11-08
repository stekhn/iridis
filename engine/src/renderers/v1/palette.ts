// The colour cycle. Instead of a cosine rainbow, the palette is a closed loop through eight key
// colours taken from the reference covers (pink, mauve, dark violet, blue, teal, green, yellow,
// orange), interpolated with a Catmull-Rom spline so it is smooth and periodic. One unit of `t`
// is one trip around the loop. `hue` (degrees) rotates the loop so that `t = 0` is the lead colour.
import { fract } from './math.ts'

export const KEY_COLORS: readonly (readonly [number, number, number])[] = [
  [0.96, 0.55, 0.7], // pink
  [0.76, 0.5, 0.78], // mauve
  [0.44, 0.42, 0.7], // dark violet blue
  [0.42, 0.63, 0.9], // blue
  [0.47, 0.8, 0.79], // teal
  [0.63, 0.86, 0.55], // green
  [0.97, 0.9, 0.52], // yellow
  [0.98, 0.68, 0.5], // orange
]
const N = KEY_COLORS.length

/** Smooth periodic colour at `t`, rotated by `hue`. Writes r, g, b (nominal 0..1) to out[o..o+2]. */
export function spectral(t: number, hue: number, out: Float32Array | number[], o = 0): void {
  const p = fract(t + hue / 360) * N
  const i = Math.floor(p)
  const u = p - i
  const u2 = u * u
  const u3 = u2 * u
  const w0 = -0.5 * u3 + u2 - 0.5 * u
  const w1 = 1.5 * u3 - 2.5 * u2 + 1
  const w2 = -1.5 * u3 + 2 * u2 + 0.5 * u
  const w3 = 0.5 * u3 - 0.5 * u2
  const p0 = KEY_COLORS[(i + N - 1) % N]!
  const p1 = KEY_COLORS[i % N]!
  const p2 = KEY_COLORS[(i + 1) % N]!
  const p3 = KEY_COLORS[(i + 2) % N]!
  out[o] = w0 * p0[0] + w1 * p1[0] + w2 * p2[0] + w3 * p3[0]
  out[o + 1] = w0 * p0[1] + w1 * p1[1] + w2 * p2[1] + w3 * p3[1]
  out[o + 2] = w0 * p0[2] + w1 * p1[2] + w2 * p2[2] + w3 * p3[2]
}

/** How far the field sweeps through the loop: a multiplier on the field value. */
export function spreadFor(colors: number): number {
  return 0.3 + 1.3 * (colors / 100)
}

/**
 * Brightness from the slider as a pair [multiplier, lift]: below 50 the colours darken, above 50
 * they lift toward white, so highlights soften instead of clipping. 50 is neutral.
 */
export function brightnessFor(brightness: number): [number, number] {
  const b = (brightness - 50) / 50
  return b < 0 ? [1 + 0.4 * b, 0] : [1, 0.4 * b]
}

/** Saturation scale from the slider: 0.4 (muted pastel) to 1.6 (vivid); 50 is the palette as designed. */
export function saturationFor(saturation: number): number {
  return 0.4 + 1.2 * (saturation / 100)
}

/**
 * Saturation scale (1 = as designed), a lift toward white (so muted colours turn pastel rather
 * than grey) and a lightness factor. Mutates out in place.
 */
export function grade(out: Float32Array, o: number, sat: number, lift: number, light: number): void {
  const r = out[o]!
  const g = out[o + 1]!
  const b = out[o + 2]!
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b
  out[o] = ((y + (r - y) * sat) * (1 - lift) + lift) * light
  out[o + 1] = ((y + (g - y) * sat) * (1 - lift) + lift) * light
  out[o + 2] = ((y + (b - y) * sat) * (1 - lift) + lift) * light
}
