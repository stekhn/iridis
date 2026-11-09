// Feature probes for the export panel. Results are memoised for the session.

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('The browser could not encode the image'))
        else if (blob.type !== type) reject(new Error(`The browser does not support ${type}`))
        else resolve(blob)
      },
      type,
      quality,
    )
  })
}

let webp: Promise<boolean> | null = null

/** Safari returns a PNG when asked for WebP, so check the blob type, not just its presence. */
export function probeWebP(): Promise<boolean> {
  if (!webp) {
    webp = (async () => {
      try {
        const c = document.createElement('canvas')
        c.width = 1
        c.height = 1
        const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/webp'))
        return blob?.type === 'image/webp'
      } catch {
        return false
      }
    })()
  }
  return webp
}

/** Whether this browser can allocate and draw into a canvas of the given size. */
export function canAllocateCanvas(width: number, height: number): boolean {
  try {
    const c = document.createElement('canvas')
    c.width = width
    c.height = height
    const ctx = c.getContext('2d')
    if (!ctx) return false
    ctx.fillStyle = '#fff'
    ctx.fillRect(width - 1, height - 1, 1, 1)
    const ok = ctx.getImageData(width - 1, height - 1, 1, 1).data[3] === 255
    c.width = 0
    c.height = 0
    return ok
  } catch {
    return false
  }
}
