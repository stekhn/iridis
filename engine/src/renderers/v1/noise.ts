import { deriveSeed, hash2, hashToUnit } from './prng.ts'
import { lerp, quintic } from './math.ts'

/** 2D value noise in [0, 1) with quintic interpolation between hashed lattice values. */
export function valueNoise2(seed: number, x: number, y: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const tx = quintic(x - xi)
  const ty = quintic(y - yi)
  const a = hashToUnit(hash2(seed, xi, yi))
  const b = hashToUnit(hash2(seed, xi + 1, yi))
  const c = hashToUnit(hash2(seed, xi, yi + 1))
  const d = hashToUnit(hash2(seed, xi + 1, yi + 1))
  return lerp(lerp(a, b, tx), lerp(c, d, tx), ty)
}

/** Fractional Brownian motion over value noise, normalised to [0, 1). Each octave has its own seed. */
export function fbm2(seed: number, x: number, y: number, octaves: number): number {
  let amp = 1
  let freq = 1
  let sum = 0
  let norm = 0
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise2(deriveSeed(seed, i), x * freq, y * freq)
    norm += amp
    amp *= 0.5
    freq *= 2
  }
  return sum / norm
}
