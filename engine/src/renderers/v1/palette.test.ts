import { describe, expect, it } from 'vitest'
import { KEY_COLORS, spectral } from './palette.ts'

const sample = (t: number, hue: number): number[] => {
  const out = [0, 0, 0]
  spectral(t, hue, out)
  return out
}

describe('spectral palette', () => {
  it('stays near the designed range (small spline overshoot allowed)', () => {
    for (let i = 0; i <= 1000; i++) {
      for (const c of sample(i / 1000, 0)) {
        expect(c).toBeGreaterThan(0.3)
        expect(c).toBeLessThan(1.05)
      }
    }
  })

  it('has period 1 and passes through the key colours', () => {
    for (let i = 0; i < 50; i++) {
      const t = i * 0.173
      const a = sample(t, 0)
      const b = sample(t + 1, 0)
      for (let c = 0; c < 3; c++) expect(b[c]).toBeCloseTo(a[c]!, 9)
    }
    KEY_COLORS.forEach((key, i) => {
      const c = sample(i / KEY_COLORS.length, 0)
      for (let k = 0; k < 3; k++) expect(c[k]).toBeCloseTo(key[k]!, 9)
    })
  })

  it('rotates with the hue', () => {
    for (let i = 0; i < 36; i++) {
      const a = sample(0.3, i * 10)
      const b = sample(0.3 + (i * 10) / 360, 0)
      for (let c = 0; c < 3; c++) expect(a[c]).toBeCloseTo(b[c]!, 9)
    }
  })
})
