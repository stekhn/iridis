// Renderer version 1. Everything that influences the pixels of a v1 cover lives in this folder:
// the hashing, the noise, the composition, the palette, the grain, the legibility guard and the
// text layout rules. A change to any of it is a new renderer version, never an edit to v1.
import type { RenderJob } from '../../types.ts'
import type { Renderer } from '../types.ts'
import { ratioValue } from '../../ratios.ts'
import { buildScene, fieldHeight, mapPalette, renderField } from './gradient.ts'
import { grainSeeds, grainStrength, renderGrain } from './grain.ts'
import { strengthForRects } from './legibility.ts'
import { RowCache } from './sampler.ts'
import { compositeRows, type CompositeContext } from './composite.ts'

export const rendererV1: Renderer = {
  version: 1,

  fieldKey(job: RenderJob): string {
    const p = job.params
    return `1|${p.seed}|${p.swirl}|${p.zoom}|${p.ratio}|${job.fieldWidth}`
  },
  renderField(job: RenderJob) {
    const ratio = ratioValue(job.params.ratio)
    const w = job.fieldWidth
    const h = fieldHeight(w, ratio)
    const scene = buildScene(job.params.seed, ratio)
    return { data: renderField(scene, job.params.swirl, job.params.zoom, w, h), w, h }
  },

  paletteKey(job: RenderJob): string {
    return `${this.fieldKey(job)}|${job.params.hue}|${job.params.colors}|${job.params.saturation}|${job.params.brightness}`
  },
  mapPalette(field: Float32Array, job: RenderJob): Float32Array {
    const scene = buildScene(job.params.seed, ratioValue(job.params.ratio))
    return mapPalette(field, job.params.hue, job.params.colors, job.params.saturation, job.params.brightness, scene)
  },

  grainKey(job: RenderJob): string {
    return `1|${job.params.seed}|${job.width}|${job.height}`
  },
  renderGrain(job: RenderJob): Int8Array {
    return renderGrain(job.params.seed, job.width, job.height)
  },

  createComposite(rgb: Float32Array, lowW: number, lowH: number, grain: Int8Array | null, job: RenderJob): CompositeContext {
    const ratio = ratioValue(job.params.ratio)
    return {
      rows: new RowCache(rgb, lowW, lowH, job.width),
      width: job.width,
      height: job.height,
      rects: job.textRects,
      darken: strengthForRects(rgb, lowW, lowH, job.textRects, ratio),
      grainSeeds: grainSeeds(job.params.seed),
      grainStrength: grainStrength(job.params.grain),
      grainCache: grain,
    }
  },

  compositeRows,
}
