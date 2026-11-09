// Export pipeline for PNG, JPEG and WebP: the worker streams the background in bands into a
// full-size canvas, the text is drawn on top with the same layout as the preview, and the
// browser encodes the result.
import { FIELD_WIDTH_FINAL, TEXT_COLOR, type CoverState, type RenderJob } from '@engine'
import type { CoverLayout } from '@engine/renderers/v1/layout'
import { renderExportBands } from '../renderClient'
import { drawLayout } from './drawText'
import { canAllocateCanvas, canvasToBlob } from './canvasCapabilities'

export type RasterFormat = 'png' | 'jpeg' | 'webp'
export type ExportFormat = RasterFormat | 'pdf'

export const FORMAT_INFO: Record<ExportFormat, { label: string; mime: string; ext: string; lossy: boolean }> = {
  png: { label: 'PNG (lossless)', mime: 'image/png', ext: 'png', lossy: false },
  jpeg: { label: 'JPEG', mime: 'image/jpeg', ext: 'jpg', lossy: true },
  webp: { label: 'WebP', mime: 'image/webp', ext: 'webp', lossy: true },
  pdf: { label: 'PDF (print, real text)', mime: 'application/pdf', ext: 'pdf', lossy: false },
}

export type ExportPhase = 'render' | 'text' | 'encode'
export interface ExportProgress {
  phase: ExportPhase
  /** 0..1 within the phase; encoding reports no progress */
  fraction: number
}

export interface BackgroundOptions {
  state: CoverState
  layout: CoverLayout
  width: number
  height: number
  onProgress: (p: ExportProgress) => void
  signal?: AbortSignal
}

/** Render the background into a fresh canvas of the export size. */
export async function renderBackgroundCanvas(o: BackgroundOptions): Promise<HTMLCanvasElement> {
  if (!canAllocateCanvas(o.width, o.height)) {
    throw new Error(`${o.width} × ${o.height} px is too large for this device. Choose a smaller size.`)
  }
  const canvas = document.createElement('canvas')
  canvas.width = o.width
  canvas.height = o.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not create a drawing context')
  const job: RenderJob = {
    version: o.state.v,
    params: o.state.params,
    width: o.width,
    height: o.height,
    textRects: o.layout.rects,
    fieldWidth: FIELD_WIDTH_FINAL,
  }
  o.onProgress({ phase: 'render', fraction: 0 })
  await renderExportBands(
    job,
    (band) => ctx.putImageData(new ImageData(new Uint8ClampedArray(band.buffer), o.width, band.rows), 0, band.y0),
    (p) => o.onProgress({ phase: 'render', fraction: p.rows / p.total }),
    o.signal,
  )
  return canvas
}

export function releaseCanvas(canvas: HTMLCanvasElement): void {
  canvas.width = 0
  canvas.height = 0
}

export interface RasterOptions extends BackgroundOptions {
  format: RasterFormat
  /** 0..1 for lossy formats */
  quality: number
}

export async function exportRaster(o: RasterOptions): Promise<Blob> {
  const canvas = await renderBackgroundCanvas(o)
  try {
    o.onProgress({ phase: 'text', fraction: 0 })
    const ctx = canvas.getContext('2d')!
    drawLayout(ctx, o.layout, o.width, TEXT_COLOR)
    o.onProgress({ phase: 'encode', fraction: 0 })
    const info = FORMAT_INFO[o.format]
    return await canvasToBlob(canvas, info.mime, info.lossy ? o.quality : undefined)
  } finally {
    releaseCanvas(canvas)
  }
}
