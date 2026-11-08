// Main-thread side of the render worker. The preview keeps one job in flight and at most one
// pending job (the latest wins), so dragging a slider never queues up stale work. Exports get
// their own worker so a long export cannot block the preview, and cancelling just terminates it.
import * as Comlink from 'comlink'
import type { RenderJob } from '@engine/types'
import type { Band, FrameResult, WorkerApi } from './render.worker'

function spawn(): { worker: Worker; remote: Comlink.Remote<WorkerApi> } {
  const worker = new Worker(new URL('./render.worker.ts', import.meta.url), { type: 'module' })
  return { worker, remote: Comlink.wrap<WorkerApi>(worker) }
}

export type FrameHandler = (frame: FrameResult, job: RenderJob) => void

export class PreviewRenderer {
  private worker: Worker | null = null
  private remote: Comlink.Remote<WorkerApi> | null = null
  private busy = false
  private pending: RenderJob | null = null
  private seq = 0
  private disposed = false
  private readonly onFrame: FrameHandler

  constructor(onFrame: FrameHandler) {
    this.onFrame = onFrame
  }

  private api(): Comlink.Remote<WorkerApi> {
    if (!this.remote) {
      const s = spawn()
      this.worker = s.worker
      this.remote = s.remote
    }
    return this.remote
  }

  /** Request a frame. Replaces any job that has not started yet. */
  schedule(job: RenderJob): void {
    this.pending = job
    void this.pump()
  }

  get isBusy(): boolean {
    return this.busy || this.pending !== null
  }

  private async pump(): Promise<void> {
    if (this.busy || !this.pending || this.disposed) return
    const job = this.pending
    this.pending = null
    this.busy = true
    const id = ++this.seq
    try {
      const frame = await this.api().renderFrame(job, id)
      if (!this.disposed) this.onFrame(frame, job)
    } catch (err) {
      console.error('preview render failed', err)
    } finally {
      this.busy = false
      void this.pump()
    }
  }

  dispose(): void {
    this.disposed = true
    this.pending = null
    this.worker?.terminate()
    this.worker = null
    this.remote = null
  }
}

export interface ExportProgress {
  /** rows finished so far */
  rows: number
  total: number
}

/**
 * Render a large background in row bands. `onBand` receives each band (RGBA, transferred);
 * aborting the signal terminates the worker.
 */
export async function renderExportBands(
  job: RenderJob,
  onBand: (band: Band) => void,
  onProgress: (p: ExportProgress) => void,
  signal?: AbortSignal,
): Promise<void> {
  const { worker, remote } = spawn()
  // Keep bands around 1 MP each, so progress ticks are frequent but messages are not tiny.
  const bandRows = Math.max(16, Math.min(job.height, Math.floor(1_000_000 / job.width)))
  let done = 0
  const handler = Comlink.proxy((band: Band) => {
    onBand(band)
    done += band.rows
    onProgress({ rows: done, total: job.height })
  })
  const onAbort = (): void => worker.terminate()
  signal?.addEventListener('abort', onAbort, { once: true })
  try {
    if (signal?.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError')
    await Promise.race([
      remote.renderExport(job, bandRows, handler),
      new Promise<never>((_, reject) => signal?.addEventListener('abort', () => reject(signal.reason ?? new DOMException('Aborted', 'AbortError')), { once: true })),
    ])
  } finally {
    signal?.removeEventListener('abort', onAbort)
    worker.terminate()
  }
}
