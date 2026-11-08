import { describe, expect, it } from 'vitest'
import { deriveSeed, hash2, hashToUnit, nextUnit, splitmix32 } from './prng.ts'

const take = (seed: number): number[] => {
  const n = splitmix32(seed)
  return [n(), n(), n(), n(), n()]
}

describe('splitmix32', () => {
  it('matches the committed known-answer values', () => {
    expect(take(0)).toEqual([2462723854, 1020716019, 454327756, 1275600319, 1215922603])
    expect(take(1)).toEqual([2527132011, 314344336, 2535364964, 2041432039, 1495043544])
    expect(take(0xdeadbeef)).toEqual([3553530007, 1645313261, 4073195585, 2760393073, 3082008752])
  })

  it('yields uint32 values that are roughly uniform', () => {
    const n = splitmix32(42)
    const buckets = new Array<number>(16).fill(0)
    for (let i = 0; i < 100_000; i++) {
      const v = n()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(0xffffffff)
      buckets[v >>> 28]!++
    }
    for (const b of buckets) expect(Math.abs(b - 6250) / 6250).toBeLessThan(0.2)
  })

  it('nextUnit stays in [0, 1)', () => {
    const n = splitmix32(7)
    for (let i = 0; i < 1000; i++) {
      const u = nextUnit(n)
      expect(u).toBeGreaterThanOrEqual(0)
      expect(u).toBeLessThan(1)
    }
  })
})

describe('hash2', () => {
  it('matches the committed known-answer values', () => {
    expect(hash2(1, 2, 3)).toBe(4100997053)
    expect(hash2(1, 3, 2)).toBe(1312623733)
    expect(hash2(7, -5, 11)).toBe(3316579165)
    expect(hash2(0, 0, 0)).toBe(0)
  })

  it('is not symmetric in x and y', () => {
    let same = 0
    for (let i = 1; i < 200; i++) if (hash2(9, i, i + 1) === hash2(9, i + 1, i)) same++
    expect(same).toBe(0)
  })

  it('hashToUnit maps into [0, 1)', () => {
    expect(hashToUnit(0)).toBe(0)
    expect(hashToUnit(0xffffffff)).toBeLessThan(1)
  })

  it('deriveSeed is distinct per salt and stable', () => {
    expect(deriveSeed(1, 0)).toBe(2189246095)
    expect(deriveSeed(1, 1)).toBe(3742986007)
    const seen = new Set<number>()
    for (let s = 0; s < 100; s++) seen.add(deriveSeed(123, s))
    expect(seen.size).toBe(100)
  })
})
