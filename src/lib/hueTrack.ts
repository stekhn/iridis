import { spectral } from '@engine'

/** CSS gradient of the lead colour for every hue, so the slider track shows what it picks. */
export function hueTrackGradient(): string {
  const stops: string[] = []
  const c = [0, 0, 0]
  for (let i = 0; i <= 36; i++) {
    spectral(0, i * 10, c)
    const rgb = c.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255)).join(' ')
    stops.push(`rgb(${rgb}) ${((i / 36) * 100).toFixed(1)}%`)
  }
  return `linear-gradient(to right, ${stops.join(', ')})`
}
