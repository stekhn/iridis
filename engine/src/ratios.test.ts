import { describe, expect, it } from 'vitest'
import { pxToMm, RATIOS, ratioValue, SIZE_PRESETS, sizeForHeight } from './ratios.ts'

describe('ratios and size presets', () => {
  it('computes output sizes per preset', () => {
    expect(sizeForHeight('5x8', 1600)).toEqual({ width: 1000, height: 1600 })
    expect(sizeForHeight('din', 3508)).toEqual({ width: 2481, height: 3508 })
    expect(sizeForHeight('1x1', 3508)).toEqual({ width: 3508, height: 3508 })
    expect(sizeForHeight('2x3', 2480)).toEqual({ width: 1653, height: 2480 })
    expect(sizeForHeight('3x4', 2480)).toEqual({ width: 1860, height: 2480 })
  })

  it('keeps the largest export under the iOS canvas limit', () => {
    const maxH = Math.max(...SIZE_PRESETS.map((p) => p.height))
    for (const r of RATIOS) {
      const { width, height } = sizeForHeight(r.id, maxH)
      expect(width * height).toBeLessThan(16_777_216)
    }
  })

  it('converts pixels to millimetres at 300 dpi', () => {
    expect(pxToMm(2480)).toBeCloseTo(209.97, 1)
    expect(pxToMm(300, 300)).toBeCloseTo(25.4, 9)
  })

  it('has strictly decreasing ratio values in the preset order', () => {
    for (let i = 1; i < RATIOS.length; i++) expect(RATIOS[i]!.value).toBeLessThan(RATIOS[i - 1]!.value)
    expect(ratioValue('5x8')).toBe(1.6)
  })
})
