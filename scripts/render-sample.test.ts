// Smoke test for the sample script: the CLI parser and a tiny render that must be a valid PNG
// with the right dimensions and a stable checksum (the engine's golden tests cover the pixels).
import { describe, expect, it } from 'vitest'
import { fnv1a32 } from '../engine/src/checksum.ts'
import { encodePng } from './png.ts'
import { parseArgs, renderRgba } from './render-sample.ts'

describe('render-sample', () => {
  it('parses arguments with defaults and clamping', () => {
    const a = parseArgs(['--seed', 'zz', '--hue', '400', '--ratio', '1x1', '--height', '64', '--out', 'x'])
    expect(a).toMatchObject({ seed: 1295, hue: 359, ratio: '1x1', height: 64, out: 'x', sheet: 0 })
    expect(parseArgs([]).ratio).toBe('5x8')
    expect(parseArgs(['--seed', '!!'])).toMatchObject({ seed: 1 })
  })

  it('renders a valid PNG with the requested size', () => {
    const a = { ...parseArgs([]), seed: 7, height: 32, fieldWidth: 16 }
    const { rgba, width, height } = renderRgba(a)
    expect(width).toBe(20)
    expect(height).toBe(32)
    const png = encodePng(rgba, width, height)
    expect(Array.from(png.subarray(0, 8))).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const view = new DataView(png.buffer, png.byteOffset)
    expect(view.getUint32(16)).toBe(20)
    expect(view.getUint32(20)).toBe(32)
    expect(fnv1a32(rgba)).toBe(fnv1a32(renderRgba(a).rgba))
  })
})
