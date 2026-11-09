import { IconCheck, IconDownload, IconLink, IconX } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'
import { exportFilename, pxToMm, SIZE_PRESETS, sizeForHeight, type CoverState } from '@engine'
import type { CoverLayout } from '@engine/renderers/v1/layout'
import { shareUrl } from '../hooks/useUrlState'
import { probeWebP } from '../lib/canvasCapabilities'
import { saveBlob } from '../lib/download'
import { exportPdf, PDF_DPI } from '../lib/exportPdf'
import { exportRaster, FORMAT_INFO, type ExportFormat, type ExportProgress } from '../lib/exportRaster'
import { Alert } from './Alert'
import { Slider } from './Slider'

interface Props {
  state: CoverState
  layout: CoverLayout
  /** the cover font has finished loading (or failed), so exported text uses the right glyphs */
  fontsReady: boolean
}

const FORMATS: ExportFormat[] = ['png', 'jpeg', 'webp', 'pdf']

function progressText(p: ExportProgress, format: ExportFormat): string {
  switch (p.phase) {
    case 'render':
      return `Rendering background ${Math.round(p.fraction * 100)}%`
    case 'text':
      return 'Setting text'
    case 'encode':
      return format === 'pdf' ? 'Building PDF' : `Encoding ${FORMAT_INFO[format].label.split(' ')[0]}`
  }
}

/** Format, size and quality, the download itself with progress, and the share link. */
export function ExportPanel({ state, layout, fontsReady }: Props) {
  const [format, setFormat] = useState<ExportFormat>('png')
  const [presetId, setPresetId] = useState<string>('a5')
  const [quality, setQuality] = useState(90)
  const [webp, setWebp] = useState<boolean | null>(null)
  const [progress, setProgress] = useState<ExportProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [includeText, setIncludeText] = useState(true)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    void probeWebP().then(setWebp)
  }, [])
  useEffect(() => () => abortRef.current?.abort(), [])

  const preset = SIZE_PRESETS.find((p) => p.id === presetId) ?? SIZE_PRESETS[0]!
  const { width, height } = sizeForHeight(state.params.ratio, preset.height)
  const busy = progress !== null
  const lossy = FORMAT_INFO[format].lossy
  const filename = exportFilename(state.params.seed, width, height, FORMAT_INFO[format].ext, includeText ? '' : 'background')
  // Without text there is nothing to protect either, so the legibility guard stays off.
  const exportLayout: CoverLayout = includeText ? layout : { ...layout, lines: [], rects: [] }

  const download = async (): Promise<void> => {
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setError(null)
    setProgress({ phase: 'render', fraction: 0 })
    try {
      const common = { state, layout: exportLayout, width, height, onProgress: setProgress, signal: ctrl.signal }
      const blob =
        format === 'pdf'
          ? await exportPdf({ ...common, shareUrl: shareUrl(state) })
          : await exportRaster({ ...common, format, quality: quality / 100 })
      saveBlob(blob, filename)
    } catch (err) {
      if (!ctrl.signal.aborted) setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      abortRef.current = null
      setProgress(null)
    }
  }

  const copyLink = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(shareUrl(state))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setError('Could not copy. Copy the address from the browser bar instead.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="format">
            Format
          </label>
          <select id="format" className="control" value={format} disabled={busy} onChange={(e) => setFormat(e.target.value as ExportFormat)}>
            {FORMATS.map((f) => (
              <option key={f} value={f} disabled={f === 'webp' && webp === false}>
                {FORMAT_INFO[f].label}
                {f === 'webp' && webp === false ? ' (not supported here)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="size">
            Size
          </label>
          <select id="size" className="control" value={presetId} disabled={busy} onChange={(e) => setPresetId(e.target.value)}>
            {SIZE_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-3 text-xs text-muted">
        <dt className="font-medium tracking-wide">Pixels</dt>
        <dd className="text-right font-semibold tabular-nums text-ink">
          {width} × {height} px
        </dd>
        <dt className="font-medium tracking-wide">At {PDF_DPI} dpi</dt>
        <dd className="text-right font-semibold tabular-nums text-ink">
          {pxToMm(width).toFixed(0)} × {pxToMm(height).toFixed(0)} mm
        </dd>
      </dl>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4 accent-accent"
          checked={includeText}
          disabled={busy}
          onChange={(e) => setIncludeText(e.target.checked)}
        />
        Include the text
      </label>

      {lossy && (
        <Slider
          id="quality"
          label="Quality"
          value={quality}
          min={50}
          max={100}
          onChange={setQuality}
          valueLabel={`${quality}%`}
          valueText={`${quality} percent`}
          disabled={busy}
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        {busy ? (
          <button type="button" className="btn-secondary" onClick={() => abortRef.current?.abort()}>
            <IconX className="size-4 text-accent" aria-hidden="true" />
            Cancel
          </button>
        ) : (
          <button type="button" className="btn-primary" onClick={download} disabled={!fontsReady}>
            <IconDownload className="size-4" aria-hidden="true" />
            Download
          </button>
        )}
        <button type="button" className="btn-secondary ml-auto" onClick={copyLink} disabled={busy}>
          {copied ? <IconCheck className="size-4 text-accent" aria-hidden="true" /> : <IconLink className="size-4 text-accent" aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>

      <p className="truncate font-mono text-xs text-muted" title={filename}>
        {filename}
      </p>

      {progress && (
        <div aria-live="polite">
          <div
            role="progressbar"
            aria-label="Export progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.phase === 'render' ? Math.round(progress.fraction * 100) : undefined}
            className="h-1.5 w-full overflow-hidden rounded-full bg-line"
          >
            <div
              className={`h-full rounded-full bg-accent ${progress.phase !== 'render' ? 'motion-safe:animate-pulse' : ''}`}
              style={{ width: progress.phase === 'render' ? `${Math.round(progress.fraction * 100)}%` : '100%' }}
            />
          </div>
          <p className="mt-1 text-xs text-muted">{progressText(progress, format)}</p>
        </div>
      )}

      {error && (
        <Alert variant="error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
    </div>
  )
}
