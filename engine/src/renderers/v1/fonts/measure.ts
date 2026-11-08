// Text measurement from advance-width tables (see scripts/extract-font-metrics.ts). Kerning is
// deliberately ignored, and the canvas and PDF renderers disable it too, so every environment
// agrees on line widths.

export interface FontMetrics {
  family: string
  unitsPerEm: number
  ascender: number
  descender: number
  capHeight: number
  xHeight: number
  /** advance for characters missing from the table */
  defaultAdvance: number
  advances: Record<string, number>
}

/** Width of `text` set at `size` (any unit), in the same unit. */
export type Measure = (text: string, size: number) => number

export function makeMeasure(m: FontMetrics): Measure {
  return (text, size) => {
    let units = 0
    for (const ch of text) units += m.advances[ch] ?? m.defaultAdvance
    return (units / m.unitsPerEm) * size
  }
}
