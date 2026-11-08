// The scalar field that drives the colours. Flat regions of the field map to one colour of the
// periodic palette (the lead colour where the field is near zero); where the field rises steeply,
// at the edge of a "lens", the palette sweeps through part of the spectrum and a band appears.
// The Swirl parameter twists the sampling domain around a centre and adds a noise warp, which
// bends the lenses into the curved, soap-film ribbons of the reference covers.
import { deriveSeed, nextRange, nextUnit, splitmix32 } from './prng.ts'
import { fbm2 } from './noise.ts'
import { smoothstep } from './math.ts'

export interface Lens {
  cx: number
  cy: number
  /** radii in cover widths along the lens axes */
  rx: number
  ry: number
  /** unit vector of the lens orientation (built with a square root, not with trigonometry) */
  ux: number
  uy: number
  /** field height inside the lens; its sign picks the direction of the spectral sweep */
  amp: number
  /** relative width of the soft edge, 0..1 of the radius */
  edge: number
  /** a thin spectral line along the lens boundary: its field height (0 = none) and its width */
  ringAmp: number
  ringWidth: number
}

export interface Scene {
  lenses: Lens[]
  warpSeedX: number
  warpSeedY: number
  fieldSeed: number
  shadeSeed: number
  /** spatial frequency of the warp noise */
  warpFreq: number
  /** amplitude of the slow colour drift across the whole cover */
  driftAmp: number
  /** vertical centre of the cover (ratio / 2), the fixed point of the Zoom slider */
  centerY: number
  /** centre, reach and direction of the twist that the Swirl slider applies */
  twistX: number
  twistY: number
  twistR: number
  twistDir: number
  /** strength of the lightness modulation (shadows and highlights) */
  shadeAmp: number
}

/** Field heights of the lenses: a main one, a secondary one, and sometimes a faint third. */
const LENS_AMPS: readonly (readonly [number, number])[] = [
  [0.35, 0.7],
  [0.2, 0.5],
  [0.12, 0.3],
]

/**
 * Build the composition for a seed. The order of the random draws is part of the v1 contract:
 * changing it changes every existing cover.
 */
export function buildScene(seed: number, ratio: number): Scene {
  const next = splitmix32(seed)
  const count = 2 + (nextUnit(next) < 0.4 ? 1 : 0)
  const lenses: Lens[] = []
  for (let i = 0; i < count; i++) {
    // Big lenses, as on the reference covers: the radius is about one to two cover widths, so
    // what shows is a broad arc, not a spot. The centre is derived from an anchor point inside
    // the cover that the lens boundary must pass through, so every lens leaves a visible band.
    const rx = nextRange(next, 0.9, 2.2)
    const ry = rx * nextRange(next, 0.6, 1)
    let ax = nextRange(next, -1, 1)
    let ay = nextRange(next, -1, 1)
    const len = Math.sqrt(ax * ax + ay * ay)
    if (len < 1e-3) {
      ax = 1
      ay = 0
    } else {
      ax /= len
      ay /= len
    }
    const px = nextRange(next, 0.05, 0.95)
    const py = nextRange(next, 0.05 * ratio, 0.95 * ratio)
    // a point on the unit circle via the rational parametrisation (no trigonometry)
    const t = nextRange(next, -1, 1)
    const sign = nextUnit(next) < 0.5 ? -1 : 1
    const c = (sign * (1 - t * t)) / (1 + t * t)
    const sn = (2 * t) / (1 + t * t)
    const cx = px - (rx * c * ax - ry * sn * ay)
    const cy = py - (rx * c * ay + ry * sn * ax)
    const [lo, hi] = LENS_AMPS[i]!
    const amp = nextRange(next, lo, hi) * (nextUnit(next) < 0.5 ? -1 : 1)
    const edge = nextRange(next, 0.15, 0.55)
    // at most one thin ring line per cover, on the first lens that draws it
    const hasRing = !lenses.some((l) => l.ringAmp !== 0) && nextUnit(next) < 0.45
    const ringAmp = hasRing ? nextRange(next, 0.15, 0.35) * (nextUnit(next) < 0.5 ? -1 : 1) : 0
    const ringWidth = nextRange(next, 0.025, 0.06)
    lenses.push({ cx, cy, rx, ry, ux: ax, uy: ay, amp, edge, ringAmp, ringWidth })
  }
  const warpFreq = nextRange(next, 0.8, 1.4)
  const driftAmp = nextRange(next, 0.06, 0.16)
  const twistX = nextRange(next, 0.15, 0.85)
  const twistY = nextRange(next, 0.15 * ratio, 0.85 * ratio)
  const twistR = nextRange(next, 0.7, 1.3)
  const twistDir = nextUnit(next) < 0.5 ? -1 : 1
  const shadeAmp = nextRange(next, 0.2, 0.38)
  return {
    lenses,
    warpSeedX: deriveSeed(seed, 101),
    warpSeedY: deriveSeed(seed, 102),
    fieldSeed: deriveSeed(seed, 103),
    shadeSeed: deriveSeed(seed, 104),
    warpFreq,
    driftAmp,
    centerY: ratio / 2,
    twistX,
    twistY,
    twistR,
    twistDir,
    shadeAmp,
  }
}

/** Zoom factor from the slider: 0.5x at 0, 1x at 50, 2x at 100 (piecewise linear, exact arithmetic). */
export function zoomFor(zoom: number): number {
  return zoom <= 50 ? 0.5 + 0.5 * (zoom / 50) : 1 + (zoom - 50) / 50
}

/** Noise displacement in cover widths at swirl = 100. */
const WARP_MAX = 0.28
/** Twist parameter at swirl = 100: the rotation angle at the centre is 2 * atan(TWIST_MAX). */
const TWIST_MAX = 1.1

/**
 * Sample the field at a point (cover units: x in [0, 1], y in [0, ratio]). Writes the field value
 * to `out[o]` and the shade value (0..1, lightness modulation) to `out[o + 1]`.
 */
export function sampleField(scene: Scene, x: number, y: number, swirl: number, zoom: number, out: Float32Array, o: number): void {
  const a = swirl / 100

  // Zoom: scale the sampling point about the cover centre (larger factor = bigger structures).
  const k = 1 / zoomFor(zoom)
  let px = 0.5 + (x - 0.5) * k
  let py = scene.centerY + (y - scene.centerY) * k

  // Twist: rotate around the centre by an angle that fades out with distance. The rotation uses
  // the rational parametrisation c = (1 - t^2) / (1 + t^2), s = 2t / (1 + t^2), so no trigonometry.
  if (a > 0) {
    const dx = px - scene.twistX
    const dy = py - scene.twistY
    const d = Math.sqrt(dx * dx + dy * dy)
    const t = a * TWIST_MAX * scene.twistDir * (1 - smoothstep(0, scene.twistR, d))
    const t2 = t * t
    const c = (1 - t2) / (1 + t2)
    const s = (2 * t) / (1 + t2)
    px = scene.twistX + dx * c - dy * s
    py = scene.twistY + dx * s + dy * c
  }

  // Noise warp on top, for the organic folds.
  const ws = a * WARP_MAX
  const wf = scene.warpFreq
  const wx = px + ws * (2 * fbm2(scene.warpSeedX, px * wf, py * wf, 3) - 1)
  const wy = py + ws * (2 * fbm2(scene.warpSeedY, px * wf + 7.31, py * wf + 3.17, 3) - 1)

  let f = scene.driftAmp * (2 * fbm2(scene.fieldSeed, wx * 0.9, wy * 0.9, 2) - 1)
  const lenses = scene.lenses
  for (let i = 0; i < lenses.length; i++) {
    const l = lenses[i]!
    const dx = wx - l.cx
    const dy = wy - l.cy
    const lx = (dx * l.ux + dy * l.uy) / l.rx
    const ly = (dy * l.ux - dx * l.uy) / l.ry
    const r = Math.sqrt(lx * lx + ly * ly)
    f += l.amp * (1 - smoothstep(1 - l.edge, 1, r))
    if (l.ringAmp !== 0) {
      // a smooth bump of width ringWidth centred on the lens boundary
      const d = (r - 1) / l.ringWidth
      if (d > -1 && d < 1) {
        const k = 1 - d * d
        f += l.ringAmp * k * k
      }
    }
  }
  out[o] = f
  out[o + 1] = fbm2(scene.shadeSeed, wx * 0.8, wy * 0.8, 2)
}
