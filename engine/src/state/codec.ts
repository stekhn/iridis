// The URL is the save file. Every parameter is always written, in a fixed order, under short
// keys, with a version number first:
//   ?v=1&s=<seed base36>&h=<hue>&c=<colours>&sa=<saturation>&b=<brightness>&z=<zoom>&w=<swirl>&g=<grain>&r=<ratio>
//     &a=<author>&t=<title>&st=<subtitle>&p=<publisher>
// Parsing is forgiving (clamps, defaults, reports issues) so a hand-edited link still renders.
import type { CoverParams, CoverState, CoverTexts } from '../types.ts'
import { CURRENT_VERSION } from '../renderers/index.ts'
import { DEFAULT_RATIO, isRatioId } from '../ratios.ts'
import { TEXT_MAX } from '../constants.ts'
import { DEFAULT_PARAMS, DEFAULT_TEXTS } from './defaults.ts'

export const HUE_MAX = 359
export const PERCENT_MAX = 100
export const SEED_MAX = 0xffffffff

export function seedToBase36(seed: number): string {
  return (seed >>> 0).toString(36)
}

export function seedFromBase36(s: string): number | null {
  if (!/^[0-9a-z]{1,7}$/i.test(s)) return null
  const n = parseInt(s, 36)
  if (!Number.isFinite(n) || n < 0 || n > SEED_MAX) return null
  return n
}

/** Drop line breaks and control characters, cap the length. Idempotent. */
export function sanitizeText(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\u0000-\u001f\u007f]+/g, ' ').slice(0, TEXT_MAX)
}

/** Apply the same text rules the parser applies, so what we write is what we would read. */
export function sanitizeState(state: CoverState): CoverState {
  const t = state.texts
  return {
    ...state,
    texts: { author: sanitizeText(t.author), title: sanitizeText(t.title), subtitle: sanitizeText(t.subtitle), publisher: sanitizeText(t.publisher) },
  }
}

/**
 * Minimal query-string codec (the engine has no DOM, so no URLSearchParams). Keys and values are
 * percent-encoded; on input "+" is read as a space for compatibility with form encoding.
 */
export function encodeQuery(pairs: readonly (readonly [string, string])[]): string {
  return pairs.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
}

function decodeComponent(s: string): string {
  try {
    return decodeURIComponent(s.replace(/\+/g, ' '))
  } catch {
    return s
  }
}

export function decodeQuery(search: string): Map<string, string> {
  const out = new Map<string, string>()
  const q = search.startsWith('?') ? search.slice(1) : search
  for (const part of q.split('&')) {
    if (!part) continue
    const i = part.indexOf('=')
    const k = decodeComponent(i < 0 ? part : part.slice(0, i))
    const v = i < 0 ? '' : decodeComponent(part.slice(i + 1))
    if (!out.has(k)) out.set(k, v)
  }
  return out
}

export function serializeState(state: CoverState): string {
  const { params: p, texts: t } = state
  return encodeQuery([
    ['v', String(state.v)],
    ['s', seedToBase36(p.seed)],
    ['h', String(p.hue)],
    ['c', String(p.colors)],
    ['sa', String(p.saturation)],
    ['b', String(p.brightness)],
    ['z', String(p.zoom)],
    ['w', String(p.swirl)],
    ['g', String(p.grain)],
    ['r', p.ratio],
    ['a', t.author],
    ['t', t.title],
    ['st', t.subtitle],
    ['p', t.publisher],
  ])
}

export interface ParsedState {
  state: CoverState
  /** the link carried no usable seed; `fallbackSeed` was used */
  seedMissing: boolean
  /** the link carried no hue; the caller may derive one from the seed */
  hueMissing: boolean
  /** human readable notes about values that were repaired */
  issues: string[]
}

function intParam(q: Map<string, string>, key: string, min: number, max: number, fallback: number, issues: string[]): number | null {
  const raw = q.get(key)
  if (raw === undefined) return null
  const n = Number(raw)
  if (!Number.isFinite(n)) {
    issues.push(`"${key}" is not a number, using ${fallback}`)
    return fallback
  }
  const r = Math.round(n)
  if (r < min || r > max) {
    issues.push(`"${key}" out of range, clamped`)
    return r < min ? min : max
  }
  return r
}

/**
 * Parse a query string (with or without the leading "?"). `fallbackSeed` is used when the link
 * has no valid seed; the engine never draws random numbers itself.
 */
export function parseState(search: string, fallbackSeed: number): ParsedState {
  const q = decodeQuery(search)
  const issues: string[] = []

  let v = CURRENT_VERSION
  const rawV = q.get('v')
  if (rawV !== undefined) {
    const n = Number(rawV)
    if (!Number.isInteger(n) || n < 1) {
      issues.push(`unknown version "${rawV}", using ${CURRENT_VERSION}`)
    } else if (n > CURRENT_VERSION) {
      issues.push(`this link was made with a newer version (${n}); rendered with version ${CURRENT_VERSION}`)
    } else {
      v = n
    }
  }

  const rawSeed = q.get('s')
  const seed = rawSeed === undefined ? null : seedFromBase36(rawSeed)
  if (rawSeed !== undefined && seed === null) issues.push('invalid seed, using a new one')

  const hue = intParam(q, 'h', 0, HUE_MAX, DEFAULT_PARAMS.hue, issues)
  const colors = intParam(q, 'c', 0, PERCENT_MAX, DEFAULT_PARAMS.colors, issues)
  const saturation = intParam(q, 'sa', 0, PERCENT_MAX, DEFAULT_PARAMS.saturation, issues)
  const brightness = intParam(q, 'b', 0, PERCENT_MAX, DEFAULT_PARAMS.brightness, issues)
  const zoom = intParam(q, 'z', 0, PERCENT_MAX, DEFAULT_PARAMS.zoom, issues)
  const swirl = intParam(q, 'w', 0, PERCENT_MAX, DEFAULT_PARAMS.swirl, issues)
  const grain = intParam(q, 'g', 0, PERCENT_MAX, DEFAULT_PARAMS.grain, issues)

  const rawRatio = q.get('r')
  let ratio = DEFAULT_RATIO
  if (rawRatio !== undefined) {
    if (isRatioId(rawRatio)) ratio = rawRatio
    else issues.push(`unknown ratio "${rawRatio}", using ${DEFAULT_RATIO}`)
  }

  const text = (key: string, fallback: string): string => {
    const raw = q.get(key)
    return raw === undefined ? fallback : sanitizeText(raw)
  }
  // Texts default to the sample texts only when the link has no text keys at all.
  const hasAnyText = ['a', 't', 'st', 'p'].some((k) => q.has(k))
  const texts: CoverTexts = hasAnyText
    ? { author: text('a', ''), title: text('t', ''), subtitle: text('st', ''), publisher: text('p', '') }
    : { ...DEFAULT_TEXTS }

  const params: CoverParams = {
    seed: seed ?? fallbackSeed >>> 0,
    hue: hue ?? DEFAULT_PARAMS.hue,
    colors: colors ?? DEFAULT_PARAMS.colors,
    saturation: saturation ?? DEFAULT_PARAMS.saturation,
    brightness: brightness ?? DEFAULT_PARAMS.brightness,
    zoom: zoom ?? DEFAULT_PARAMS.zoom,
    swirl: swirl ?? DEFAULT_PARAMS.swirl,
    grain: grain ?? DEFAULT_PARAMS.grain,
    ratio,
  }
  return { state: { v, params, texts }, seedMissing: seed === null, hueMissing: hue === null, issues }
}
