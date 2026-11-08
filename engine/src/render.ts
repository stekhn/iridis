// Orchestrates the renderer stages with three caches (field, palette, grain), so that moving one
// slider only recomputes what depends on it. One instance lives in the worker; the Node sample
// script uses another.
import type { RenderJob } from './types.ts'
import { getRenderer, type CompositeHandle } from './renderers/index.ts'
import { GRAIN_CACHE_MAX_PX } from './constants.ts'

interface Cached<T> {
  key: string
  data: T
}

export class CoverRenderer {
  private field: Cached<{ data: Float32Array; w: number; h: number }> | null = null
  private palette: Cached<Float32Array> | null = null
  private grain: Cached<Int8Array> | null = null

  /** Run (or reuse) the cached stages and return a handle to composite rows from. */
  prepare(job: RenderJob): CompositeHandle {
    const renderer = getRenderer(job.version)

    const fieldKey = renderer.fieldKey(job)
    if (!this.field || this.field.key !== fieldKey) {
      this.field = { key: fieldKey, data: renderer.renderField(job) }
      this.palette = null
    }
    const { data: field, w, h } = this.field.data

    const paletteKey = renderer.paletteKey(job)
    if (!this.palette || this.palette.key !== paletteKey) {
      this.palette = { key: paletteKey, data: renderer.mapPalette(field, job) }
    }

    let grain: Int8Array | null = null
    if (job.params.grain > 0 && job.width * job.height <= GRAIN_CACHE_MAX_PX) {
      const grainKey = renderer.grainKey(job)
      if (!this.grain || this.grain.key !== grainKey) {
        this.grain = { key: grainKey, data: renderer.renderGrain(job) }
      }
      grain = this.grain.data
    }

    return renderer.createComposite(this.palette.data, w, h, grain, job)
  }

  /** Composite rows [y0, y1) of a prepared job into `out` ((y1 - y0) * width RGBA pixels). */
  renderRows(job: RenderJob, handle: CompositeHandle, y0: number, y1: number, out: Uint8ClampedArray): void {
    getRenderer(job.version).compositeRows(handle, y0, y1, out)
  }

  /** Render a whole frame. */
  render(job: RenderJob): Uint8ClampedArray {
    const handle = this.prepare(job)
    const out = new Uint8ClampedArray(job.width * job.height * 4)
    this.renderRows(job, handle, 0, job.height, out)
    return out
  }
}
