import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import fontkit from '@pdf-lib/fontkit'
import { hankenBold } from './hankenBold.metrics.ts'
import { hankenMedium } from './hankenMedium.metrics.ts'
import { makeMeasure } from './measure.ts'

const FONT_DIR = new URL('../../../../../src/assets/fonts/', import.meta.url)
const SAMPLES = ['Slavoj Žižek', 'For a Quantum Theory of History', 'Tre Oci – Geophilosophy', 'AVAWA Type ff', 'Straße & Co. €12', 'What is Equality?']

describe('advance-width tables', () => {
  it('cover the characters the covers need', () => {
    for (const ch of [...'AZaz09 !?&€…“”äöüÄÖÜßžŽčŠéàñ']) {
      expect(hankenBold.advances[ch], `bold ${ch}`).toBeTypeOf('number')
      expect(hankenMedium.advances[ch], `medium ${ch}`).toBeTypeOf('number')
    }
    expect(hankenBold.unitsPerEm).toBe(1000)
    expect(hankenBold.capHeight).toBeGreaterThan(600)
  })

  it.each([
    ['HankenGrotesk-Bold.ttf', hankenBold],
    ['HankenGrotesk-Medium.ttf', hankenMedium],
  ])('%s: makeMeasure agrees with fontkit unkerned layout within 0.5%%', (file, metrics) => {
    const font = fontkit.create(new Uint8Array(readFileSync(new URL(file, FONT_DIR))))
    const measure = makeMeasure(metrics)
    for (const s of SAMPLES) {
      const expected = font.layout(s, { kern: false, liga: false, calt: false }).advanceWidth
      const got = measure(s, metrics.unitsPerEm)
      expect(Math.abs(got - expected) / expected).toBeLessThan(0.005)
    }
  })
})
