import type { CSSProperties } from 'react'

interface Props {
  id: string
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  /** what the readout on the right shows (defaults to the value) */
  valueLabel?: string
  /** spoken value for assistive technology */
  valueText?: string
  style?: CSSProperties
  disabled?: boolean
}

/** A labelled native range input: keyboard friendly (arrows, Home/End, Page keys) for free. */
export function Slider({ id, label, value, min, max, step = 1, onChange, valueLabel, valueText, style, disabled }: Props) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="label" htmlFor={id}>
          {label}
        </label>
        <output htmlFor={id} className="text-xs tabular-nums text-muted">
          {valueLabel ?? String(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        className="slider"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={valueText}
        style={style}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}
