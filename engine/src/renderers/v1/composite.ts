// Stage 4: upsample the palette image to output pixels, apply the legibility darkening, add the
// grain and write RGBA bytes. Works in row bands so exports can stream and report progress.
import type { Rect } from '../../types.ts'
import { cubicWeights, RowCache } from './sampler.ts'
import { darkenAt } from './legibility.ts'
import { grainAt, type GrainSeeds } from './grain.ts'

export interface CompositeContext {
  rows: RowCache
  width: number
  height: number
  /** text rects in cover units and the darkening strength that applies to them */
  rects: readonly Rect[]
  darken: number
  grainSeeds: GrainSeeds
  grainStrength: number
  /** precomputed grain for this exact output size, or null to compute per pixel */
  grainCache: Int8Array | null
}

/**
 * Render output rows [y0, y1) into `out`, which holds exactly (y1 - y0) * width RGBA pixels.
 */
export function compositeRows(ctx: CompositeContext, y0: number, y1: number, out: Uint8ClampedArray): void {
  const { rows, width, height, rects, darken, grainSeeds, grainStrength, grainCache } = ctx
  const w = new Float64Array(4)
  const scaleY = rows.srcH / height
  let o = 0
  for (let y = y0; y < y1; y++) {
    const sy = (y + 0.5) * scaleY - 0.5
    const iy = Math.floor(sy)
    cubicWeights(sy - iy, w)
    const r0 = rows.row(iy - 1)
    const r1 = rows.row(iy)
    const r2 = rows.row(iy + 1)
    const r3 = rows.row(iy + 2)
    const w0 = w[0]!
    const w1 = w[1]!
    const w2 = w[2]!
    const w3 = w[3]!
    const v = (y + 0.5) / width
    const grainRow = y * width
    for (let x = 0; x < width; x++) {
      const i = x * 3
      let r = w0 * r0[i]! + w1 * r1[i]! + w2 * r2[i]! + w3 * r3[i]!
      let g = w0 * r0[i + 1]! + w1 * r1[i + 1]! + w2 * r2[i + 1]! + w3 * r3[i + 1]!
      let b = w0 * r0[i + 2]! + w1 * r1[i + 2]! + w2 * r2[i + 2]! + w3 * r3[i + 2]!
      const u = (x + 0.5) / width
      if (darken > 0) {
        const m = darkenAt(rects, darken, u, v)
        r *= m
        g *= m
        b *= m
      }
      if (grainStrength > 0) {
        const n = grainCache ? grainCache[grainRow + x]! / 127 : grainAt(grainSeeds, u, v)
        const d = n * grainStrength
        r += d
        g += d
        b += d
      }
      // Uint8ClampedArray rounds half to even and clamps, as the ECMAScript spec defines.
      out[o] = r * 255
      out[o + 1] = g * 255
      out[o + 2] = b * 255
      out[o + 3] = 255
      o += 4
    }
  }
}
