import { IconArrowsShuffle } from '@tabler/icons-react'
import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { HUE_MAX, PERCENT_MAX, RATIOS, seedToBase36, type CoverParams, type RatioId } from '@engine'
import { hueTrackGradient } from '../lib/hueTrack'
import { Slider } from './Slider'

interface Props {
  params: CoverParams
  onChange: (patch: Partial<CoverParams>) => void
  onShuffle: () => void
}

const HUE_NAMES: [number, string][] = [
  [0, 'pink'],
  [45, 'mauve'],
  [90, 'violet'],
  [135, 'blue'],
  [180, 'teal'],
  [225, 'green'],
  [270, 'yellow'],
  [315, 'orange'],
  [360, 'pink'],
]

function hueName(hue: number): string {
  let best = HUE_NAMES[0]!
  for (const entry of HUE_NAMES) if (Math.abs(entry[0] - hue) < Math.abs(best[0] - hue)) best = entry
  return best[1]
}

/** The four controls that shape the background, plus the dice. */
export function ControlsPanel({ params, onChange, onShuffle }: Props) {
  const hueStyle = useMemo(() => ({ '--track': hueTrackGradient() }) as CSSProperties, [])
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button type="button" className="btn-primary" onClick={onShuffle}>
          <IconArrowsShuffle className="size-4" aria-hidden="true" />
          Shuffle
        </button>
        <p className="text-xs text-muted">
          Seed <code className="rounded bg-canvas-bg px-1.5 py-0.5 font-mono text-ink">{seedToBase36(params.seed)}</code>
        </p>
      </div>

      <Slider
        id="hue"
        label="Lead colour"
        value={params.hue}
        min={0}
        max={HUE_MAX}
        onChange={(hue) => onChange({ hue })}
        valueLabel={hueName(params.hue)}
        valueText={`${params.hue} degrees, ${hueName(params.hue)}`}
        style={hueStyle}
      />
      <Slider
        id="colors"
        label="Colours"
        value={params.colors}
        min={0}
        max={PERCENT_MAX}
        onChange={(colors) => onChange({ colors })}
        valueLabel={`${params.colors}%`}
        valueText={`${params.colors} percent, how far the bands run through the spectrum`}
      />
      <Slider
        id="saturation"
        label="Saturation"
        value={params.saturation}
        min={0}
        max={PERCENT_MAX}
        onChange={(saturation) => onChange({ saturation })}
        valueLabel={`${params.saturation}%`}
        valueText={`${params.saturation} percent`}
      />
      <Slider
        id="brightness"
        label="Brightness"
        value={params.brightness}
        min={0}
        max={PERCENT_MAX}
        onChange={(brightness) => onChange({ brightness })}
        valueLabel={`${params.brightness}%`}
        valueText={`${params.brightness} percent`}
      />
      <Slider
        id="zoom"
        label="Zoom"
        value={params.zoom}
        min={0}
        max={PERCENT_MAX}
        onChange={(zoom) => onChange({ zoom })}
        valueLabel={`${params.zoom}%`}
        valueText={`${params.zoom} percent, ${params.zoom <= 50 ? 'smaller' : 'larger'} structures`}
      />
      <Slider
        id="swirl"
        label="Swirl"
        value={params.swirl}
        min={0}
        max={PERCENT_MAX}
        onChange={(swirl) => onChange({ swirl })}
        valueLabel={`${params.swirl}%`}
        valueText={`${params.swirl} percent`}
      />
      <Slider
        id="grain"
        label="Grain"
        value={params.grain}
        min={0}
        max={PERCENT_MAX}
        onChange={(grain) => onChange({ grain })}
        valueLabel={`${params.grain}%`}
        valueText={`${params.grain} percent`}
      />

      <div>
        <label className="label" htmlFor="ratio">
          Aspect ratio
        </label>
        <select id="ratio" className="control" value={params.ratio} onChange={(e) => onChange({ ratio: e.target.value as RatioId })}>
          {RATIOS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
