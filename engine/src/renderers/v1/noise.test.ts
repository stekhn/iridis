import { describe, expect, it } from 'vitest'
import { fbm2, valueNoise2 } from './noise.ts'
import { hash2, hashToUnit, nextRange, splitmix32 } from './prng.ts'

describe('valueNoise2', () => {
  it('stays in [0, 1) and is deterministic', () => {
    const n = splitmix32(3)
    for (let i = 0; i < 10_000; i++) {
      const x = nextRange(n, -50, 50)
      const y = nextRange(n, -50, 50)
      const v = valueNoise2(11, x, y)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
      expect(valueNoise2(11, x, y)).toBe(v)
    }
  })

  it('equals the hashed value on lattice points', () => {
    for (const [x, y] of [[0, 0], [3, -2], [-7, 9], [100, 100]]) {
      expect(valueNoise2(5, x!, y!)).toBe(hashToUnit(hash2(5, x!, y!)))
    }
  })

  it('is continuous', () => {
    for (let i = 0; i < 2000; i++) {
      const x = i * 0.0137
      const y = i * 0.0071
      expect(Math.abs(valueNoise2(2, x, y) - valueNoise2(2, x + 1e-3, y))).toBeLessThan(0.02)
    }
  })

  it('depends on the seed', () => {
    let diff = 0
    for (let i = 0; i < 100; i++) if (valueNoise2(1, i * 0.37, i * 0.11) !== valueNoise2(2, i * 0.37, i * 0.11)) diff++
    expect(diff).toBeGreaterThan(90)
  })
})

describe('fbm2', () => {
  it('stays in [0, 1)', () => {
    for (let i = 0; i < 5000; i++) {
      const v = fbm2(9, i * 0.013, i * 0.007, 3)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})
