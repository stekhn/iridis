import { describe, expect, it } from 'vitest'
import { darkenAt, darkenStrength, FEATHER, MAX_DARKEN, meanLuminance } from './legibility.ts'

const filled = (w: number, h: number, v: number): Float32Array => new Float32Array(w * h * 3).fill(v)
const rect = { x: 0.1, y: 0.1, w: 0.5, h: 0.3 }

describe('legibility guard', () => {
  it('measures luminance under a rect', () => {
    expect(meanLuminance(filled(8, 13, 1), 8, 13, rect, 1.6)).toBeCloseTo(1, 6)
    expect(meanLuminance(filled(8, 13, 0), 8, 13, rect, 1.6)).toBe(0)
    expect(meanLuminance(filled(8, 13, 0.5), 8, 13, rect, 1.6)).toBeCloseTo(0.5, 6)
  })

  it('darkening strength is 0 for mid tones and MAX for white, monotone in between', () => {
    expect(darkenStrength(0.5)).toBe(0)
    expect(darkenStrength(1)).toBeCloseTo(MAX_DARKEN, 9)
    let prev = -1
    for (let i = 0; i <= 100; i++) {
      const s = darkenStrength(i / 100)
      expect(s).toBeGreaterThanOrEqual(prev)
      prev = s
    }
  })

  it('darkenAt is full inside, fades with distance and is 1 far away', () => {
    expect(darkenAt([rect], 0.1, 0.3, 0.2)).toBeCloseTo(0.9, 9)
    expect(darkenAt([rect], 0.1, 0.9, 1.5)).toBe(1)
    expect(darkenAt([], 0.1, 0.3, 0.2)).toBe(1)
    expect(darkenAt([rect], 0, 0.3, 0.2)).toBe(1)
    let prev = 0
    for (let d = 0; d <= FEATHER + 0.05; d += 0.005) {
      const m = darkenAt([rect], 0.1, 0.3, 0.4 + d)
      expect(m).toBeGreaterThanOrEqual(prev - 1e-9)
      prev = m
    }
  })
})
