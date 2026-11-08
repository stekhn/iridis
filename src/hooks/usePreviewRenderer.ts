// Drives the preview canvas. While a slider moves, frames are rendered at a small pixel budget
// and upscaled; 150 ms after the last change a full-resolution frame replaces them. Text is
// drawn on top on the main thread, from the cached frame, so typing never re-renders the
// background unless the text box the legibility guard protects actually moved.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { FIELD_WIDTH_DRAFT, FIELD_WIDTH_FINAL, ratioValue, TEXT_COLOR, type CoverState, type Rect, type RenderJob } from '@engine'
import type { CoverLayout } from '@engine/renderers/v1/layout'
import { PreviewRenderer } from '../renderClient'
import type { FrameResult } from '../render.worker'
import { drawLayout } from '../lib/drawText'

const DRAFT_BUDGET_PX = 500_000
const FINAL_BUDGET_PX = 4_000_000
const MAX_DPR = 2
const SETTLE_MS = 150

interface Size {
  cssW: number
  cssH: number
}

/** Round rects so tiny layout jitter does not invalidate the background cache. */
function roundRects(rects: Rect[]): Rect[] {
  const r3 = (n: number): number => Math.round(n * 1000) / 1000
  return rects.map((r) => ({ x: r3(r.x), y: r3(r.y), w: r3(r.w), h: r3(r.h) }))
}

function fit(container: DOMRectReadOnly, ratio: number, padding: number): Size {
  const maxW = Math.max(1, container.width - 2 * padding)
  const maxH = Math.max(1, container.height - 2 * padding)
  let cssW = maxW
  let cssH = cssW * ratio
  if (cssH > maxH) {
    cssH = maxH
    cssW = cssH / ratio
  }
  return { cssW: Math.floor(cssW), cssH: Math.floor(cssH) }
}

function budgetSize(cssW: number, cssH: number, dpr: number, budget: number): { width: number; height: number } {
  let w = cssW * dpr
  let h = cssH * dpr
  if (w * h > budget) {
    const k = Math.sqrt(budget / (w * h))
    w *= k
    h *= k
  }
  return { width: Math.max(1, Math.round(w)), height: Math.max(1, Math.round(h)) }
}

export interface PreviewApi {
  /** a background frame is being rendered */
  busy: boolean
}

export function usePreviewRenderer(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  containerRef: RefObject<HTMLDivElement | null>,
  state: CoverState,
  layout: CoverLayout,
  fontsReady: boolean,
  padding = 16,
): PreviewApi {
  const [size, setSize] = useState<Size>({ cssW: 0, cssH: 0 })
  const [busy, setBusy] = useState(false)
  const rendererRef = useRef<PreviewRenderer | null>(null)
  const frameRef = useRef<FrameResult | null>(null)
  const scratchRef = useRef<HTMLCanvasElement | null>(null)
  const layoutRef = useRef(layout)
  const fontsRef = useRef(fontsReady)
  const lastFinalKey = useRef<string>('')
  const lastBaseKey = useRef<string>('')
  const displayedKey = useRef<string>('')

  const ratio = ratioValue(state.params.ratio)

  // Paint the cached frame (scaled to the canvas) and the text on top.
  const paint = (): void => {
    const canvas = canvasRef.current
    const frame = frameRef.current
    if (!canvas || !frame) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let scratch = scratchRef.current
    if (!scratch) {
      scratch = document.createElement('canvas')
      scratchRef.current = scratch
    }
    if (scratch.width !== frame.width || scratch.height !== frame.height) {
      scratch.width = frame.width
      scratch.height = frame.height
    }
    const sctx = scratch.getContext('2d')
    if (!sctx) return
    sctx.putImageData(new ImageData(new Uint8ClampedArray(frame.buffer), frame.width, frame.height), 0, 0)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(scratch, 0, 0, canvas.width, canvas.height)
    if (fontsRef.current) drawLayout(ctx, layoutRef.current, canvas.width, TEXT_COLOR)
  }
  const paintRef = useRef(paint)
  useLayoutEffect(() => {
    layoutRef.current = layout
    fontsRef.current = fontsReady
    paintRef.current = paint
  })

  // One worker for the lifetime of the component.
  useEffect(() => {
    const renderer = new PreviewRenderer((frame, job) => {
      frameRef.current = frame
      displayedKey.current = JSON.stringify(job)
      paintRef.current()
      setBusy(renderer.isBusy)
    })
    rendererRef.current = renderer
    return () => {
      renderer.dispose()
      rendererRef.current = null
    }
  }, [])

  // Track the container size.
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = (): void => {
      const next = fit(el.getBoundingClientRect(), ratio, padding)
      setSize((prev) => (prev.cssW === next.cssW && prev.cssH === next.cssH ? prev : next))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [containerRef, ratio, padding])

  // Size the canvas element (CSS and pixel size) whenever the fit changes.
  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || size.cssW === 0) return
    const dpr = Math.min(MAX_DPR, devicePixelRatio || 1)
    const { width, height } = budgetSize(size.cssW, size.cssH, dpr, FINAL_BUDGET_PX)
    canvas.style.width = `${size.cssW}px`
    canvas.style.height = `${size.cssH}px`
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
      paintRef.current()
    }
  }, [canvasRef, size])

  // Schedule background renders: a draft right away, the final one once the input settles.
  const rectsKey = JSON.stringify(roundRects(layout.rects))
  const rects = useMemo(() => JSON.parse(rectsKey) as Rect[], [rectsKey])
  const { params } = state
  useEffect(() => {
    const renderer = rendererRef.current
    if (!renderer || size.cssW === 0) return
    const dpr = Math.min(MAX_DPR, devicePixelRatio || 1)
    const full = budgetSize(size.cssW, size.cssH, dpr, FINAL_BUDGET_PX)
    const finalJob: RenderJob = { version: state.v, params, width: full.width, height: full.height, textRects: rects, fieldWidth: FIELD_WIDTH_FINAL }
    const finalKey = JSON.stringify(finalJob)
    const baseKey = JSON.stringify({ v: state.v, params, width: full.width, height: full.height })
    if (finalKey === lastFinalKey.current) {
      // Same state as the last settled render; only re-render if a draft is still on screen.
      if (displayedKey.current !== finalKey) renderer.schedule(finalJob)
      return
    }
    if (baseKey === lastBaseKey.current) {
      // Only the text boxes moved: the field and palette are cached, so go straight to final.
      lastFinalKey.current = finalKey
      renderer.schedule(finalJob)
      return
    }
    lastBaseKey.current = baseKey
    const draft = budgetSize(size.cssW, size.cssH, 1, DRAFT_BUDGET_PX)
    renderer.schedule({ ...finalJob, width: draft.width, height: draft.height, fieldWidth: FIELD_WIDTH_DRAFT })
    setBusy(true)
    const t = setTimeout(() => {
      lastFinalKey.current = finalKey
      renderer.schedule(finalJob)
    }, SETTLE_MS)
    return () => clearTimeout(t)
  }, [state.v, params, rects, size])

  // Text or font changes only repaint.
  useEffect(() => {
    paintRef.current()
  }, [layout, fontsReady])

  return { busy }
}
