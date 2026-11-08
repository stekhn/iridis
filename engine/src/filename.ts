import { seedToBase36 } from './state/codec.ts'

/**
 * `iridis-<seed>-<WxH>.<ext>`, or `iridis-<seed>-<tag>-<WxH>.<ext>` with a tag such as
 * "background": the seed ties an exported file back to its link.
 */
export function exportFilename(seed: number, width: number, height: number, ext: string, tag = ''): string {
  const mid = tag ? `-${tag}` : ''
  return `iridis-${seedToBase36(seed)}${mid}-${width}x${height}.${ext.replace(/^\./, '')}`
}
