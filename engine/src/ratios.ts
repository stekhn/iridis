import type { RatioId } from './types.ts'

export interface RatioPreset {
  id: RatioId
  label: string
  /** height divided by width */
  value: number
}

export const RATIOS: readonly RatioPreset[] = [
  { id: '5x8', label: '5:8 (paperback)', value: 1.6 },
  { id: '2x3', label: '2:3', value: 1.5 },
  { id: 'din', label: '1:√2 (A series)', value: Math.SQRT2 },
  { id: '3x4', label: '3:4', value: 4 / 3 },
  { id: '1x1', label: '1:1 (square)', value: 1 },
]

export const DEFAULT_RATIO: RatioId = '5x8'

export function isRatioId(s: string): s is RatioId {
  return RATIOS.some((r) => r.id === s)
}

export function ratioValue(id: RatioId): number {
  const r = RATIOS.find((p) => p.id === id)
  if (!r) throw new Error(`Unknown ratio ${id}`)
  return r.value
}

export interface SizePreset {
  id: 'screen' | 'a5' | 'a4'
  label: string
  /** output height in pixels */
  height: number
  /** nominal print resolution the pixel size is stated for */
  dpi: number
}

export const SIZE_PRESETS: readonly SizePreset[] = [
  { id: 'screen', label: 'Screen', height: 1600, dpi: 300 },
  { id: 'a5', label: 'Print, A5 height', height: 2480, dpi: 300 },
  { id: 'a4', label: 'Print, A4 height', height: 3508, dpi: 300 },
]

export function sizeForHeight(ratio: RatioId, height: number): { width: number; height: number } {
  return { width: Math.round(height / ratioValue(ratio)), height }
}

export function pxToMm(px: number, dpi = 300): number {
  return (px / dpi) * 25.4
}
