import type { Renderer } from './types.ts'
import { rendererV1 } from './v1/index.ts'

export const CURRENT_VERSION = 1

const RENDERERS: Record<number, Renderer> = { 1: rendererV1 }

export function getRenderer(version: number): Renderer {
  const r = RENDERERS[version]
  if (!r) throw new Error(`No renderer for version ${version}`)
  return r
}

export type { Renderer, CompositeHandle } from './types.ts'
