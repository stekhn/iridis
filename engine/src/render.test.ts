// Golden tests for renderer v1. If the checksum changes, the algorithm changed: either revert, or
// make it a new version. Run with UPDATE_GOLDEN=1 to regenerate after a deliberate v1 change
// before the first release (after release, v1 is frozen).
import { readFileSync, writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CoverRenderer } from './render.ts'
import { fnv1a32, hex32 } from './checksum.ts'
import type { RenderJob } from './types.ts'

const FIXTURE = new URL('../test/fixtures/render_golden.json', import.meta.url)
const rect = { x: 0.08, y: 0.045, w: 0.6, h: 0.4 }

const CASES: { name: string; job: RenderJob }[] = [
  { name: 'pink 5x8', job: { version: 1, params: { seed: 1, hue: 330, colors: 50, saturation: 50, brightness: 50, zoom: 50, swirl: 55, grain: 45, ratio: '5x8' }, width: 40, height: 64, textRects: [], fieldWidth: 64 } },
  { name: 'pink 5x8 with text rect', job: { version: 1, params: { seed: 1, hue: 330, colors: 50, saturation: 50, brightness: 50, zoom: 50, swirl: 55, grain: 45, ratio: '5x8' }, width: 40, height: 64, textRects: [rect], fieldWidth: 64 } },
  { name: 'green square no swirl', job: { version: 1, params: { seed: 0xdeadbeef, hue: 120, colors: 100, saturation: 100, brightness: 80, zoom: 100, swirl: 0, grain: 0, ratio: '1x1' }, width: 48, height: 48, textRects: [], fieldWidth: 64 } },
  { name: 'blue din full swirl and grain', job: { version: 1, params: { seed: 777, hue: 210, colors: 0, saturation: 0, brightness: 20, zoom: 0, swirl: 100, grain: 100, ratio: 'din' }, width: 34, height: 48, textRects: [rect], fieldWidth: 48 } },
]

interface Golden {
  cases: Record<string, string>
}

function loadGolden(): Golden {
  try {
    return JSON.parse(readFileSync(FIXTURE, 'utf8')) as Golden
  } catch {
    return { cases: {} }
  }
}

describe('renderer v1 golden checksums', () => {
  const golden = loadGolden()
  const update = process.env['UPDATE_GOLDEN'] === '1'
  const actual: Record<string, string> = {}

  for (const { name, job } of CASES) {
    it(name, () => {
      const sum = hex32(fnv1a32(new CoverRenderer().render(job)))
      actual[name] = sum
      if (!update) expect(sum, 'checksum changed: the v1 algorithm must not change').toBe(golden.cases[name])
    })
  }

  it('fixture is up to date', () => {
    if (update) {
      writeFileSync(FIXTURE, JSON.stringify({ cases: actual }, null, 2) + '\n')
    } else {
      expect(Object.keys(golden.cases).sort()).toEqual(CASES.map((c) => c.name).sort())
    }
  })
})

describe('renderer v1 structure', () => {
  const job = CASES[1]!.job

  it('renders bands identical to the whole frame', () => {
    const r = new CoverRenderer()
    const whole = r.render(job)
    const handle = r.prepare(job)
    const banded = new Uint8ClampedArray(whole.length)
    for (let y0 = 0; y0 < job.height; y0 += 7) {
      const y1 = Math.min(job.height, y0 + 7)
      const band = new Uint8ClampedArray((y1 - y0) * job.width * 4)
      r.renderRows(job, handle, y0, y1, band)
      banded.set(band, y0 * job.width * 4)
    }
    expect(banded).toEqual(whole)
  })

  it('cached stages give the same bytes as a fresh renderer', () => {
    const r = new CoverRenderer()
    const first = r.render(job)
    const hueChanged = { ...job, params: { ...job.params, hue: 40 } }
    expect(r.render(hueChanged)).toEqual(new CoverRenderer().render(hueChanged))
    expect(r.render(job)).toEqual(first)
    const grainChanged = { ...job, params: { ...job.params, grain: 10 } }
    expect(r.render(grainChanged)).toEqual(new CoverRenderer().render(grainChanged))
  })

  it('is opaque and the grain slider changes pixels', () => {
    const r = new CoverRenderer()
    const a = r.render(job)
    for (let i = 3; i < a.length; i += 4) expect(a[i]).toBe(255)
    const b = r.render({ ...job, params: { ...job.params, grain: 0 } })
    let diff = 0
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++
    expect(diff).toBeGreaterThan(a.length / 4)
  })

  it('the colours slider adds distinct hues and the saturation slider adds chroma', () => {
    const base = { ...CASES[0]!.job, textRects: [], width: 60, height: 96 }
    const distinct = (colors: number): number => {
      const px = new CoverRenderer().render({ ...base, params: { ...base.params, colors, grain: 0 } })
      const seen = new Set<number>()
      for (let i = 0; i < px.length; i += 4) seen.add(((px[i]! >> 5) << 6) | ((px[i + 1]! >> 5) << 3) | (px[i + 2]! >> 5))
      return seen.size
    }
    expect(distinct(0)).toBeLessThan(distinct(50))
    expect(distinct(50)).toBeLessThan(distinct(100))

    const chroma = (saturation: number): number => {
      const px = new CoverRenderer().render({ ...base, params: { ...base.params, saturation, grain: 0 } })
      let sum = 0
      for (let i = 0; i < px.length; i += 4) sum += Math.max(px[i]!, px[i + 1]!, px[i + 2]!) - Math.min(px[i]!, px[i + 1]!, px[i + 2]!)
      return sum / (px.length / 4)
    }
    expect(chroma(0)).toBeLessThan(chroma(50))
    expect(chroma(50)).toBeLessThan(chroma(100))

    const luma = (brightness: number): number => {
      const px = new CoverRenderer().render({ ...base, params: { ...base.params, brightness, grain: 0 } })
      let sum = 0
      for (let i = 0; i < px.length; i += 4) sum += 0.2126 * px[i]! + 0.7152 * px[i + 1]! + 0.0722 * px[i + 2]!
      return sum / (px.length / 4)
    }
    expect(luma(0)).toBeLessThan(luma(50))
    expect(luma(50)).toBeLessThan(luma(100))
  })

  it('zooming in shows the centre of the zoomed-out field at twice the size', () => {
    // Same field sampled densely: the 2x zoom must match the central crop of the 1x render.
    const base = { ...CASES[2]!.job, textRects: [], params: { ...CASES[2]!.job.params, grain: 0, swirl: 0 } }
    const wide = new CoverRenderer().render({ ...base, params: { ...base.params, zoom: 50 }, width: 96, height: 96, fieldWidth: 192 })
    const near = new CoverRenderer().render({ ...base, params: { ...base.params, zoom: 100 }, width: 96, height: 96, fieldWidth: 192 })
    let err = 0
    let n = 0
    for (let y = 8; y < 88; y += 2) {
      for (let x = 8; x < 88; x += 2) {
        // pixel (x, y) in the zoomed render shows cover point 0.5 + (x/96 - 0.5)/2
        const wx = Math.round(48 + (x + 0.5 - 48) / 2 - 0.5)
        const wy = Math.round(48 + (y + 0.5 - 48) / 2 - 0.5)
        for (let c = 0; c < 3; c++) {
          err += Math.abs(near[(y * 96 + x) * 4 + c]! - wide[(wy * 96 + wx) * 4 + c]!)
          n++
        }
      }
    }
    expect(err / n).toBeLessThan(6)
  })

  it('is resolution independent (small render matches the box-filtered large render)', () => {
    const base = { ...CASES[2]!.job, textRects: [] }
    const small = new CoverRenderer().render({ ...base, width: 24, height: 24 })
    const large = new CoverRenderer().render({ ...base, width: 96, height: 96 })
    let err = 0
    for (let y = 0; y < 24; y++) {
      for (let x = 0; x < 24; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0
          for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 4; dx++) sum += large[((y * 4 + dy) * 96 + x * 4 + dx) * 4 + c]!
          err += Math.abs(sum / 16 - small[(y * 24 + x) * 4 + c]!)
        }
      }
    }
    expect(err / (24 * 24 * 3)).toBeLessThan(2.5)
  })
})
