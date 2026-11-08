// Catmull-Rom (bicubic) upsampling of the low-res RGB grid, separable: rows are first widened
// horizontally and cached, then each output row blends four of them vertically.

/** Catmull-Rom weights for fractional position t in [0, 1). */
export function cubicWeights(t: number, out: Float64Array): void {
  const t2 = t * t
  const t3 = t2 * t
  out[0] = -0.5 * t3 + t2 - 0.5 * t
  out[1] = 1.5 * t3 - 2.5 * t2 + 1
  out[2] = -1.5 * t3 + 2 * t2 + 0.5 * t
  out[3] = 0.5 * t3 - 0.5 * t2
}

function clampIndex(i: number, n: number): number {
  return i < 0 ? 0 : i >= n ? n - 1 : i
}

/** Widen one low-res row (3 channels) to `dstW` pixels. */
export function upsampleRow(src: Float32Array, srcW: number, srcRow: number, dstW: number): Float32Array {
  const dst = new Float32Array(dstW * 3)
  const base = srcRow * srcW * 3
  const w = new Float64Array(4)
  const scale = srcW / dstW
  for (let x = 0; x < dstW; x++) {
    const sx = (x + 0.5) * scale - 0.5
    const ix = Math.floor(sx)
    cubicWeights(sx - ix, w)
    const i0 = clampIndex(ix - 1, srcW) * 3
    const i1 = clampIndex(ix, srcW) * 3
    const i2 = clampIndex(ix + 1, srcW) * 3
    const i3 = clampIndex(ix + 2, srcW) * 3
    const o = x * 3
    for (let c = 0; c < 3; c++) {
      dst[o + c] =
        w[0]! * src[base + i0 + c]! +
        w[1]! * src[base + i1 + c]! +
        w[2]! * src[base + i2 + c]! +
        w[3]! * src[base + i3 + c]!
    }
  }
  return dst
}

/** Lazily widened rows of one low-res image for one output width. */
export class RowCache {
  private readonly rows: (Float32Array | null)[]
  private readonly src: Float32Array
  readonly srcW: number
  readonly srcH: number
  readonly dstW: number

  constructor(src: Float32Array, srcW: number, srcH: number, dstW: number) {
    this.src = src
    this.srcW = srcW
    this.srcH = srcH
    this.dstW = dstW
    this.rows = new Array<Float32Array | null>(srcH).fill(null)
  }

  row(i: number): Float32Array {
    const k = clampIndex(i, this.srcH)
    let r = this.rows[k]
    if (!r) {
      r = upsampleRow(this.src, this.srcW, k, this.dstW)
      this.rows[k] = r
    }
    return r
  }
}
