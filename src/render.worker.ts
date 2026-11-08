// Background render Web Worker. Comlink exposes two functions: `renderFrame` for the preview
// (whole frame, buffer transferred back) and `renderExport` for large outputs (streamed in row
// bands so the main thread can show progress and never holds the full frame twice).
import * as Comlink from 'comlink'
import { CoverRenderer } from '@engine/render'
import type { RenderJob } from '@engine/types'

const renderer = new CoverRenderer()

export interface FrameResult {
  jobId: number
  width: number
  height: number
  buffer: ArrayBuffer
}

export interface Band {
  y0: number
  rows: number
  buffer: ArrayBuffer
}

function renderFrame(job: RenderJob, jobId: number): FrameResult {
  const rgba = renderer.render(job)
  const result: FrameResult = { jobId, width: job.width, height: job.height, buffer: rgba.buffer as ArrayBuffer }
  return Comlink.transfer(result, [result.buffer])
}

async function renderExport(job: RenderJob, bandRows: number, onBand: (band: Band) => void): Promise<void> {
  const handle = renderer.prepare(job)
  for (let y0 = 0; y0 < job.height; y0 += bandRows) {
    const rows = Math.min(bandRows, job.height - y0)
    const out = new Uint8ClampedArray(rows * job.width * 4)
    renderer.renderRows(job, handle, y0, y0 + rows, out)
    const band: Band = { y0, rows, buffer: out.buffer as ArrayBuffer }
    onBand(Comlink.transfer(band, [band.buffer]))
    // Yield between bands so the progress messages flush in order.
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

const api = { renderFrame, renderExport }
export type WorkerApi = typeof api
Comlink.expose(api)
