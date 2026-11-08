// Integer hashing and a small PRNG. Everything here is exact integer arithmetic (Math.imul, xor,
// shifts), so the results are identical in every JavaScript engine.

/** splitmix32: a 32-bit stream generator. Returns uint32 values. */
export function splitmix32(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x9e3779b9) >>> 0
    let z = s
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0
    return (z ^ (z >>> 16)) >>> 0
  }
}

/** Hash of an integer lattice point under a seed. Returns uint32. */
export function hash2(seed: number, x: number, y: number): number {
  let h = (seed ^ Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1)) >>> 0
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0
  return (h ^ (h >>> 15)) >>> 0
}

/** uint32 to [0, 1). Division by a power of two is exact. */
export function hashToUnit(h: number): number {
  return (h >>> 0) / 4294967296
}

/** A new seed for a sub-generator, so stages never share a hash stream. */
export function deriveSeed(seed: number, salt: number): number {
  return hash2(seed, salt | 0, 0x51ed270b)
}

/** Draw a float in [0, 1) from a splitmix32 stream. */
export function nextUnit(next: () => number): number {
  return hashToUnit(next())
}

/** Draw a float in [lo, hi). */
export function nextRange(next: () => number, lo: number, hi: number): number {
  return lo + (hi - lo) * nextUnit(next)
}

/** Draw an integer in [0, n). */
export function nextInt(next: () => number, n: number): number {
  return Math.floor(nextUnit(next) * n)
}
