// Keeps white text readable on very light parts of the gradient. The guard measures the mean
// luminance under the text rectangles and, only when it is high, darkens the area around them
// with a wide, soft falloff. It is a pure function of the state, so it is reproducible and it
// is part of the exported pixels.
import type { Rect } from '../../types.ts'
import { clamp01, smoothstep } from './math.ts'

/** Mean relative luminance (0..1, gamma space) of the low-res RGB under a rect. */
export function meanLuminance(rgb: Float32Array, lowW: number, lowH: number, rect: Rect, ratio: number): number {
  const x0 = Math.max(0, Math.floor(rect.x * lowW))
  const x1 = Math.min(lowW, Math.ceil((rect.x + rect.w) * lowW))
  const y0 = Math.max(0, Math.floor((rect.y / ratio) * lowH))
  const y1 = Math.min(lowH, Math.ceil(((rect.y + rect.h) / ratio) * lowH))
  if (x1 <= x0 || y1 <= y0) return 0
  let sum = 0
  let n = 0
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const o = (y * lowW + x) * 3
      sum += 0.2126 * clamp01(rgb[o]!) + 0.7152 * clamp01(rgb[o + 1]!) + 0.0722 * clamp01(rgb[o + 2]!)
      n++
    }
  }
  return sum / n
}

/** Darkening strength (0..MAX_DARKEN) for a given background luminance. */
export const MAX_DARKEN = 0.18
export function darkenStrength(lum: number): number {
  return MAX_DARKEN * smoothstep(0.72, 0.9, lum)
}

/** Width of the soft falloff outside a rect, in cover widths. */
export const FEATHER = 0.22

/** Multiplier (1 - strength .. 1) at a point: full darkening inside the rects, fading outside. */
export function darkenAt(rects: readonly Rect[], strength: number, u: number, v: number): number {
  if (strength <= 0 || rects.length === 0) return 1
  let fall = 0
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i]!
    const dx = Math.max(r.x - u, 0, u - (r.x + r.w))
    const dy = Math.max(r.y - v, 0, v - (r.y + r.h))
    const d = Math.sqrt(dx * dx + dy * dy)
    const f = 1 - smoothstep(0, FEATHER, d)
    if (f > fall) fall = f
  }
  return 1 - strength * fall
}

/** One strength for all rects, driven by the brightest one. */
export function strengthForRects(rgb: Float32Array, lowW: number, lowH: number, rects: readonly Rect[], ratio: number): number {
  let lum = 0
  for (const r of rects) {
    const l = meanLuminance(rgb, lowW, lowH, r, ratio)
    if (l > lum) lum = l
  }
  return darkenStrength(lum)
}
