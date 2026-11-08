import { describe, expect, it } from 'vitest'
import { LAYOUT, layoutCover, splitAuthor, variantForSeed, wrapLines, type MeasureSet } from './layout.ts'
import type { CoverTexts } from '../../types.ts'

// A simple monospace stand-in: every character is half the size wide.
const mono = (text: string, size: number): number => text.length * 0.5 * size
const M: MeasureSet = { bold: mono, medium: mono }
const texts: CoverTexts = { author: 'Mira Sandoval', title: 'The Weight of Light', subtitle: '', publisher: 'Iridis Editions' }
const RATIO = 1.6

describe('splitAuthor', () => {
  it('splits at the last space', () => {
    expect(splitAuthor('Mira Sandoval')).toEqual(['Mira', 'Sandoval'])
    expect(splitAuthor('  Gabriel  García Márquez ')).toEqual(['Gabriel García', 'Márquez'])
    expect(splitAuthor('Plato')).toEqual(['Plato'])
    expect(splitAuthor('   ')).toEqual([])
  })
})

describe('variantForSeed', () => {
  it('is deterministic and both variants occur', () => {
    const seen = new Set<string>()
    for (let s = 0; s < 64; s++) {
      expect(variantForSeed(s)).toBe(variantForSeed(s))
      seen.add(variantForSeed(s))
    }
    expect(seen.size).toBe(2)
  })
})

describe('wrapLines', () => {
  it('wraps greedily and lets over-long words stand alone', () => {
    expect(wrapLines('aa bb cc dd', 0.3, 0.1, mono)).toEqual(['aa bb', 'cc dd'])
    expect(wrapLines('aaaaaaaaaa bb', 0.3, 0.1, mono)).toEqual(['aaaaaaaaaa', 'bb'])
    expect(wrapLines('', 0.3, 0.1, mono)).toEqual([])
  })
})

describe('layoutCover', () => {
  it('runs author and title on one line grid, as on the reference covers', () => {
    const l = layoutCover(texts, 'given-left', RATIO, M)
    const [given, family, title] = l.lines
    const pitch = LAYOUT.size * LAYOUT.lineHeight
    expect(family!.baseline - given!.baseline).toBeCloseTo(pitch, 9)
    expect(title!.baseline - family!.baseline).toBeCloseTo(pitch + LAYOUT.titleGap * LAYOUT.size, 9)
  })

  it('places the given name and family name on opposite sides, title on the given side', () => {
    const l = layoutCover(texts, 'given-left', RATIO, M)
    const [given, family, title] = l.lines
    expect(given).toMatchObject({ text: 'Mira', align: 'left', x: LAYOUT.marginLeft, role: 'author', weight: 'bold' })
    expect(family).toMatchObject({ text: 'Sandoval', align: 'right', x: 1 - LAYOUT.marginRight, role: 'author', weight: 'bold' })
    expect(title).toMatchObject({ align: 'left', role: 'title', weight: 'medium' })
    expect(family!.baseline).toBeGreaterThan(given!.baseline)
    expect(title!.baseline).toBeGreaterThan(family!.baseline)
    expect(l.scale).toBe(1)

    const r = layoutCover(texts, 'given-right', RATIO, M)
    expect(r.lines[0]).toMatchObject({ text: 'Mira', align: 'right' })
    expect(r.lines[1]).toMatchObject({ text: 'Sandoval', align: 'left' })
    expect(r.lines[2]).toMatchObject({ align: 'right', role: 'title' })
  })

  it('puts the publisher small in the bottom left corner', () => {
    const l = layoutCover(texts, 'given-left', RATIO, M)
    const pub = l.lines[l.lines.length - 1]!
    expect(pub).toMatchObject({ role: 'publisher', weight: 'medium', align: 'left', x: LAYOUT.marginLeft })
    expect(pub.baseline).toBeCloseTo(RATIO - LAYOUT.bottom, 9)
    expect(pub.size).toBe(LAYOUT.publisherSize)
  })

  it('wraps the title to at most four lines and shrinks when needed', () => {
    const long = { ...texts, title: 'The Unbearable Lightness of Being Among Other Things' }
    const l = layoutCover(long, 'given-left', RATIO, M)
    const titleLines = l.lines.filter((x) => x.role === 'title')
    expect(titleLines.length).toBeLessThanOrEqual(LAYOUT.maxTitleLines)
    expect(l.scale).toBeLessThan(1)
    expect(l.scale).toBeGreaterThanOrEqual(LAYOUT.minScale)
    for (const t of titleLines) expect(t.width).toBeLessThanOrEqual(LAYOUT.maxLineWidth + 1e-9)

    // An absurd title bottoms out at the minimum scale instead of looping forever
    const absurd = { ...texts, title: 'word '.repeat(60) }
    const a = layoutCover(absurd, 'given-left', RATIO, M)
    expect(a.scale).toBeGreaterThanOrEqual(LAYOUT.minScale)
    expect(a.lines.length).toBeGreaterThan(0)
  })

  it('shrinks a single word that does not fit between the margins', () => {
    const l = layoutCover({ ...texts, author: 'Dampfschifffahrtsamt' }, 'given-left', RATIO, M)
    expect(l.scale).toBeLessThan(1)
    expect(l.lines[0]!.width).toBeLessThanOrEqual(1 - LAYOUT.marginLeft - LAYOUT.marginRight + 1e-9)
  })

  it('skips empty fields and returns nothing for an empty cover', () => {
    const empty = layoutCover({ author: '', title: '', subtitle: '', publisher: '' }, 'given-left', RATIO, M)
    expect(empty.lines).toEqual([])
    expect(empty.rects).toEqual([])
    const onlyTitle = layoutCover({ ...texts, author: '', publisher: '' }, 'given-left', RATIO, M)
    expect(onlyTitle.lines.every((l) => l.role === 'title')).toBe(true)
    expect(onlyTitle.lines[0]!.baseline).toBeCloseTo(LAYOUT.top + 0.697 * LAYOUT.size, 3)
  })

  it('sets the subtitle smaller, below the title, same alignment', () => {
    const l = layoutCover({ ...texts, subtitle: 'Essays on colour and perception' }, 'given-right', RATIO, M)
    const title = l.lines.filter((x) => x.role === 'title')
    const sub = l.lines.filter((x) => x.role === 'subtitle')
    expect(sub.length).toBeGreaterThan(0)
    expect(sub[0]!.size).toBeCloseTo(LAYOUT.size * LAYOUT.subtitleSize, 9)
    expect(sub[0]!.align).toBe('right')
    expect(sub[0]!.weight).toBe('medium')
    expect(sub[0]!.baseline).toBeGreaterThan(title[title.length - 1]!.baseline)
  })

  it('rects cover every line box', () => {
    const l = layoutCover({ ...texts, subtitle: 'A subtitle' }, 'given-left', RATIO, M)
    expect(l.rects.length).toBe(2)
    for (const line of l.lines) {
      const x0 = line.align === 'left' ? line.x : line.x - line.width
      const inside = l.rects.some(
        (r) => x0 >= r.x - 1e-9 && x0 + line.width <= r.x + r.w + 1e-9 && line.baseline <= r.y + r.h + 1e-9 && line.baseline >= r.y,
      )
      expect(inside, line.text).toBe(true)
    }
  })
})
