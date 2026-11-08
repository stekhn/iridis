import { memo, useRef } from 'react'
import type { CoverState } from '@engine'
import type { CoverLayout } from '@engine/renderers/v1/layout'
import { usePreviewRenderer } from '../hooks/usePreviewRenderer'

interface Props {
  state: CoverState
  layout: CoverLayout
  fontsReady: boolean
}

/** The cover, rendered by the worker and fitted into the available space. */
export const CoverPreview = memo(function CoverPreview({ state, layout, fontsReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  usePreviewRenderer(canvasRef, containerRef, state, layout, fontsReady)
  const { author, title } = state.texts
  const label = [author.trim(), title.trim()].filter(Boolean).join(': ') || 'untitled'
  return (
    <div
      ref={containerRef}
      className="relative flex h-[62dvh] min-h-[20rem] w-full items-center justify-center overflow-hidden rounded-lg bg-canvas-bg lg:h-[calc(100dvh-10.5rem)] lg:min-h-[30rem]"
    >
      <canvas ref={canvasRef} role="img" aria-label={`Cover preview: ${label}`} className="block shadow-xl" />
    </div>
  )
})
