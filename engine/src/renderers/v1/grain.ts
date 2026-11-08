// Film-like grain on a virtual grid that is fixed relative to the cover, not to the pixel grid.
// A screen preview and a print export therefore show grain of the same character; the print just
// resolves it more finely.
import { deriveSeed } from './prng.ts'
import { valueNoise2 } from './noise.ts'

/** grain cells across the cover width (coarse octave) */
export const GRAIN_CELLS = 1500
const FINE_RATIO = 2.3

export interface GrainSeeds {
  coarse: number
  fine: number
}

export function grainSeeds(seed: number): GrainSeeds {
  return { coarse: deriveSeed(seed, 901), fine: deriveSeed(seed, 902) }
}

/** Grain value in [-1, 1] at a point in cover units. */
export function grainAt(g: GrainSeeds, u: number, v: number): number {
  const n1 = valueNoise2(g.coarse, u * GRAIN_CELLS, v * GRAIN_CELLS)
  const n2 = valueNoise2(g.fine, u * GRAIN_CELLS * FINE_RATIO, v * GRAIN_CELLS * FINE_RATIO)
  return 0.65 * (2 * n1 - 1) + 0.35 * (2 * n2 - 1)
}

/** Grain for a whole output size, quantised to Int8 (value * 127). */
export function renderGrain(seed: number, width: number, height: number): Int8Array {
  const g = grainSeeds(seed)
  const out = new Int8Array(width * height)
  let o = 0
  for (let y = 0; y < height; y++) {
    const v = (y + 0.5) / width
    for (let x = 0; x < width; x++) {
      out[o++] = Math.round(grainAt(g, (x + 0.5) / width, v) * 127)
    }
  }
  return out
}

/** Slider value 0..100 to the additive amplitude in 0..1 colour units. */
export function grainStrength(grain: number): number {
  return (grain / 100) * 0.24
}
