import type { RenderJob } from '../types.ts'

/** Opaque per-render state a renderer builds once and then composites rows from. */
export interface CompositeHandle {
  width: number
  height: number
}

/**
 * A renderer version. The CoverRenderer caches the three expensive stages by the keys the
 * renderer returns, so a hue change reuses the field and a grain change reuses both.
 */
export interface Renderer {
  readonly version: number
  fieldKey(job: RenderJob): string
  renderField(job: RenderJob): { data: Float32Array; w: number; h: number }
  paletteKey(job: RenderJob): string
  mapPalette(field: Float32Array, job: RenderJob): Float32Array
  grainKey(job: RenderJob): string
  renderGrain(job: RenderJob): Int8Array
  createComposite(rgb: Float32Array, lowW: number, lowH: number, grain: Int8Array | null, job: RenderJob): CompositeHandle
  compositeRows(ctx: CompositeHandle, y0: number, y1: number, out: Uint8ClampedArray): void
}
