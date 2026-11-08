// Text layout rules of renderer v1, derived from the reference covers:
//  - the author is split into given and family name on two lines, flush to opposite sides, bold,
//  - the title follows in the same size but a lighter weight, aligned to the given-name side,
//  - the subtitle (if any) is set smaller below it, same alignment and weight,
//  - the publisher imprint sits small in the bottom left corner.
// Everything is in cover units (width 1, height = ratio). Measuring uses advance-width tables so
// the result is identical on every platform. If the text does not fit, the whole block scales
// down in steps; the user never positions anything.
import type { CoverTexts, Rect } from '../../types.ts'
import { hash2 } from './prng.ts'
import { hankenBold } from './fonts/hankenBold.metrics.ts'
import { hankenMedium } from './fonts/hankenMedium.metrics.ts'
import { makeMeasure, type Measure } from './fonts/measure.ts'

export type Variant = 'given-left' | 'given-right'
export type Role = 'author' | 'title' | 'subtitle' | 'publisher'
export type Weight = 'bold' | 'medium'
export type Align = 'left' | 'right'

export interface Line {
  text: string
  /** anchor x: the left edge for align 'left', the right edge for align 'right' */
  x: number
  baseline: number
  size: number
  width: number
  align: Align
  role: Role
  weight: Weight
}

export interface CoverLayout {
  lines: Line[]
  /** boxes the legibility guard protects: the main text block and the imprint */
  rects: Rect[]
  /** 1 = full size, smaller when the text had to shrink to fit */
  scale: number
  variant: Variant
}

export interface MeasureSet {
  bold: Measure
  medium: Measure
}

/**
 * Measured on the reference covers (all values in cover widths): a wider left margin than right,
 * type at about 11.5% of the width, one continuous line grid for author and title, the imprint
 * at about 3% in the bottom left corner.
 */
export const LAYOUT = {
  marginLeft: 0.1,
  marginRight: 0.06,
  top: 0.065,
  bottom: 0.055,
  size: 0.115,
  lineHeight: 1.0,
  /** extra space between the author block and the title, in title sizes */
  titleGap: 0,
  subtitleSize: 0.55,
  /** extra space between the title and the subtitle, in subtitle sizes */
  subtitleGap: 0.8,
  wrapWidth: 0.55,
  maxLineWidth: 0.84,
  maxTitleLines: 4,
  publisherSize: 0.031,
  minScale: 0.4,
  scaleStep: 0.92,
} as const

export const METRICS = {
  bold: hankenBold,
  medium: hankenMedium,
  capHeight: hankenBold.capHeight / hankenBold.unitsPerEm,
  descender: -hankenBold.descender / hankenBold.unitsPerEm,
} as const

export const DEFAULT_MEASURES: MeasureSet = {
  bold: makeMeasure(hankenBold),
  medium: makeMeasure(hankenMedium),
}

/** Which side the given name sits on; decided by the seed like the rest of the composition. */
export function variantForSeed(seed: number): Variant {
  return (hash2(seed >>> 0, 7, 7) & 1) === 0 ? 'given-left' : 'given-right'
}

/** ["Given names", "Family"] split at the last space; a single word stays whole. */
export function splitAuthor(author: string): string[] {
  const parts = author.trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return parts
  return [parts.slice(0, -1).join(' '), parts[parts.length - 1]!]
}

/** Greedy word wrap. A word wider than `maxWidth` stands on its own line. */
export function wrapLines(text: string, maxWidth: number, size: number, measure: Measure): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (line && measure(next, size) > maxWidth) {
      lines.push(line)
      line = w
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}

interface Block {
  author: string[]
  title: string[]
  subtitle: string[]
  size: number
  subtitleSize: number
  bottom: number
}

function buildBlock(texts: CoverTexts, scale: number, m: MeasureSet, ratio: number): { block: Block; fits: boolean } {
  const L = LAYOUT
  const size = L.size * scale
  const subtitleSize = size * L.subtitleSize
  const avail = 1 - L.marginLeft - L.marginRight
  const author = splitAuthor(texts.author)
  const title = wrapLines(texts.title, L.wrapWidth, size, m.medium)
  const subtitle = wrapLines(texts.subtitle, L.wrapWidth, subtitleSize, m.medium)

  let fits = author.every((p) => m.bold(p, size) <= avail)
  fits &&= title.length <= L.maxTitleLines && title.every((t) => m.medium(t, size) <= L.maxLineWidth)
  fits &&= subtitle.every((t) => m.medium(t, subtitleSize) <= L.maxLineWidth)

  // vertical extent of the block
  let y = L.top + METRICS.capHeight * size
  const lh = size * L.lineHeight
  if (author.length) y += (author.length - 1) * lh
  if (title.length) {
    if (author.length) y += lh + L.titleGap * size
    y += (title.length - 1) * lh
  }
  if (subtitle.length) {
    if (author.length || title.length) y += subtitleSize * (L.lineHeight + L.subtitleGap)
    y += (subtitle.length - 1) * subtitleSize * L.lineHeight
  }
  const bottom = y + METRICS.descender * (subtitle.length ? subtitleSize : size)
  fits &&= bottom <= ratio - L.bottom - L.publisherSize * 3
  return { block: { author, title, subtitle, size, subtitleSize, bottom }, fits }
}

export function layoutCover(texts: CoverTexts, variant: Variant, ratio: number, m: MeasureSet = DEFAULT_MEASURES): CoverLayout {
  const L = LAYOUT
  let scale = 1
  let built = buildBlock(texts, scale, m, ratio)
  while (!built.fits && scale * L.scaleStep >= L.minScale) {
    scale *= L.scaleStep
    built = buildBlock(texts, scale, m, ratio)
  }
  const { author, title, subtitle, size, subtitleSize } = built.block

  const left = L.marginLeft
  const right = 1 - L.marginRight
  const givenAlign: Align = variant === 'given-left' ? 'left' : 'right'
  const familyAlign: Align = givenAlign === 'left' ? 'right' : 'left'
  const lines: Line[] = []
  const push = (text: string, baseline: number, sz: number, align: Align, role: Role, weight: Weight): void => {
    const measure = weight === 'bold' ? m.bold : m.medium
    lines.push({ text, x: align === 'left' ? left : right, baseline, size: sz, width: measure(text, sz), align, role, weight })
  }

  const lh = size * L.lineHeight
  let y = L.top + METRICS.capHeight * size
  let hasBlock = false
  author.forEach((part, i) => {
    push(part, y, size, i === 0 ? givenAlign : familyAlign, 'author', 'bold')
    if (i < author.length - 1) y += lh
    hasBlock = true
  })
  if (title.length) {
    if (hasBlock) y += lh + L.titleGap * size
    title.forEach((t, i) => {
      push(t, y, size, givenAlign, 'title', 'medium')
      if (i < title.length - 1) y += lh
    })
    hasBlock = true
  }
  if (subtitle.length) {
    if (hasBlock) y += subtitleSize * (L.lineHeight + L.subtitleGap)
    subtitle.forEach((t, i) => {
      push(t, y, subtitleSize, givenAlign, 'subtitle', 'medium')
      if (i < subtitle.length - 1) y += subtitleSize * L.lineHeight
    })
  }

  const rects: Rect[] = []
  if (lines.length) {
    let x0 = 1
    let x1 = 0
    for (const l of lines) {
      const lx0 = l.align === 'left' ? l.x : l.x - l.width
      x0 = Math.min(x0, lx0)
      x1 = Math.max(x1, lx0 + l.width)
    }
    const first = lines[0]!
    const last = lines[lines.length - 1]!
    const top = first.baseline - METRICS.capHeight * first.size
    const bottom = last.baseline + METRICS.descender * last.size
    rects.push({ x: x0, y: top, w: x1 - x0, h: bottom - top })
  }

  const publisher = texts.publisher.trim()
  if (publisher) {
    let psize = L.publisherSize
    const avail = 1 - L.marginLeft - L.marginRight
    while (m.medium(publisher, psize) > avail && psize > L.publisherSize * 0.5) psize *= 0.9
    const baseline = ratio - L.bottom
    push(publisher, baseline, psize, 'left', 'publisher', 'medium')
    const l = lines[lines.length - 1]!
    const cap = (hankenMedium.capHeight / hankenMedium.unitsPerEm) * psize
    rects.push({ x: l.x, y: baseline - cap, w: l.width, h: cap + METRICS.descender * psize })
  }

  return { lines, rects, scale, variant }
}
