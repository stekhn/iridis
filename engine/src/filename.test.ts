import { describe, expect, it } from 'vitest'
import { exportFilename } from './filename.ts'

describe('exportFilename', () => {
  it('contains the seed and the pixel size', () => {
    expect(exportFilename(0xdeadbeef, 1000, 1600, 'png')).toBe('iridis-1ps9wxb-1000x1600.png')
    expect(exportFilename(1, 2481, 3508, '.pdf')).toBe('iridis-1-2481x3508.pdf')
    expect(exportFilename(1, 2481, 3508, 'png', 'background')).toBe('iridis-1-background-2481x3508.png')
  })
  it('never contains spaces', () => {
    expect(exportFilename(42, 10, 20, 'jpg')).not.toMatch(/\s/)
  })
})
