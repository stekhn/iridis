// Small numeric helpers. Only +, -, *, /, abs, floor, min, max and sqrt are used anywhere in the
// renderer, because those are the operations ECMAScript defines exactly. Transcendental functions
// (sin, cos, pow, exp, ...) are "implementation-approximated" and may differ between engines.

export function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x
}

export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Hermite step: 0 below e0, 1 above e1, smooth in between. */
export function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp01((x - e0) / (e1 - e0))
  return t * t * (3 - 2 * t)
}

/** Quintic fade used by the value noise (zero first and second derivative at the lattice). */
export function quintic(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10)
}

export function fract(x: number): number {
  return x - Math.floor(x)
}

/** Triangle wave with period 1 in [0, 1]: 0 at integers, 1 at half integers. */
export function tri(x: number): number {
  return 1 - Math.abs(2 * fract(x) - 1)
}

/**
 * Smooth periodic wave with period 1 in [0, 1], peaking at integers like a raised cosine
 * (cos(2πx) + 1) / 2 would, but built from the triangle wave and a Hermite step so it needs no
 * trigonometry. It is continuous with a continuous first derivative.
 */
export function wave(x: number): number {
  const t = tri(x + 0.5)
  return t * t * (3 - 2 * t)
}
