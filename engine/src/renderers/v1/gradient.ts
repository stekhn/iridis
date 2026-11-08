// Stage 1 (field) and stage 2 (palette) of the renderer. Both work on a low-res grid in cover
// units: `w` cells across the width, `h = round(w * ratio)` cells down. Every output size samples
// this grid, so the picture does not depend on the output resolution.
import { buildScene, sampleField, type Scene } from './field.ts'
import { brightnessFor, grade, saturationFor, spectral, spreadFor } from './palette.ts'

export function fieldHeight(fieldWidth: number, ratio: number): number {
  return Math.max(1, Math.round(fieldWidth * ratio))
}

/** Field values and shade values interleaved: [f, shade, f, shade, ...], row-major. */
export function renderField(scene: Scene, swirl: number, zoom: number, w: number, h: number): Float32Array {
  const out = new Float32Array(w * h * 2)
  let o = 0
  for (let j = 0; j < h; j++) {
    const y = (j + 0.5) / w
    for (let i = 0; i < w; i++) {
      sampleField(scene, (i + 0.5) / w, y, swirl, zoom, out, o)
      o += 2
    }
  }
  return out
}

/** Map a field buffer to RGB floats (nominally 0..1, highlights may exceed 1 before clamping). */
export function mapPalette(
  field: Float32Array,
  hue: number,
  colors: number,
  saturation: number,
  brightness: number,
  scene: Scene,
): Float32Array {
  const n = field.length / 2
  const out = new Float32Array(n * 3)
  const shadeAmp = scene.shadeAmp
  const spread = spreadFor(colors)
  const sat = saturationFor(saturation)
  const [mul, liftBright] = brightnessFor(brightness)
  const lift = Math.min(0.85, Math.max(0, 1 - sat) * 0.35 + liftBright)
  for (let k = 0; k < n; k++) {
    const f = field[k * 2]! * spread
    const shade = field[k * 2 + 1]!
    const o = k * 3
    spectral(f, hue, out, o)
    grade(out, o, sat, lift, mul * (1 + shadeAmp * (2 * shade - 1)))
  }
  return out
}

export { buildScene }
