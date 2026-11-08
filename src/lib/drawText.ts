import type { CoverLayout } from '@engine/renderers/v1/layout'
import { COVER_FONT_FAMILY } from './fonts'

/**
 * Draw a layout onto a canvas. `pxPerUnit` is the cover width in pixels (the layout is in cover
 * units). Kerning and ligatures are switched off where the browser supports it, so the glyph
 * advances match the width tables the layout was computed with.
 */
export function drawLayout(ctx: CanvasRenderingContext2D, layout: CoverLayout, pxPerUnit: number, color: string): void {
  ctx.save()
  ctx.fillStyle = color
  ctx.textBaseline = 'alphabetic'
  if ('fontKerning' in ctx) ctx.fontKerning = 'none'
  if ('textRendering' in ctx) ctx.textRendering = 'optimizeSpeed'
  for (const line of layout.lines) {
    const weight = line.weight === 'bold' ? 700 : 500
    ctx.font = `${weight} ${line.size * pxPerUnit}px "${COVER_FONT_FAMILY}"`
    ctx.textAlign = line.align
    ctx.fillText(line.text, line.x * pxPerUnit, line.baseline * pxPerUnit)
  }
  ctx.restore()
}
