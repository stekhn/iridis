import { describe, expect, it } from 'vitest'
import { parseState, sanitizeState, seedFromBase36, seedToBase36, serializeState } from './codec.ts'
import { DEFAULT_PARAMS, DEFAULT_TEXTS } from './defaults.ts'
import { RATIOS } from '../ratios.ts'
import { TEXT_MAX } from '../constants.ts'
import { splitmix32, nextInt, nextUnit } from '../renderers/v1/prng.ts'
import type { CoverState } from '../types.ts'

const ALPHABET = [...'abc XYZ äöüß žŽ 😀 &=#+%?/\\"\'“”’€', ' ', ' ', 'ä']

function randomText(next: () => number, max: number): string {
  const len = nextInt(next, max)
  let s = ''
  for (let i = 0; i < len; i++) s += ALPHABET[nextInt(next, ALPHABET.length)]!
  return s
}

function randomState(next: () => number): CoverState {
  return {
    v: 1,
    params: {
      seed: next(),
      hue: nextInt(next, 360),
      colors: nextInt(next, 101),
      saturation: nextInt(next, 101),
      brightness: nextInt(next, 101),
      zoom: nextInt(next, 101),
      swirl: nextInt(next, 101),
      grain: nextInt(next, 101),
      ratio: RATIOS[nextInt(next, RATIOS.length)]!.id,
    },
    texts: {
      author: randomText(next, 40),
      title: randomText(next, 60),
      subtitle: nextUnit(next) < 0.5 ? '' : randomText(next, 60),
      publisher: randomText(next, 30),
    },
  }
}

describe('seed encoding', () => {
  it('roundtrips base36 for the whole uint32 range', () => {
    for (const s of [0, 1, 35, 36, 123456789, 0xffffffff]) expect(seedFromBase36(seedToBase36(s))).toBe(s)
  })
  it('rejects garbage', () => {
    expect(seedFromBase36('')).toBeNull()
    expect(seedFromBase36('zzzzzzzz')).toBeNull()
    expect(seedFromBase36('-1')).toBeNull()
    expect(seedFromBase36('1.5')).toBeNull()
  })
})

describe('URL state codec', () => {
  it('serialises every key in canonical order', () => {
    const s = serializeState({ v: 1, params: DEFAULT_PARAMS, texts: DEFAULT_TEXTS })
    expect(s.split('&').map((kv) => kv.split('=')[0])).toEqual(['v', 's', 'h', 'c', 'sa', 'b', 'z', 'w', 'g', 'r', 'a', 't', 'st', 'p'])
    expect(s.startsWith('v=1&s=')).toBe(true)
  })

  it('roundtrips the defaults', () => {
    const state: CoverState = { v: 1, params: DEFAULT_PARAMS, texts: DEFAULT_TEXTS }
    const parsed = parseState(serializeState(state), 99)
    expect(parsed.state).toEqual(state)
    expect(parsed.seedMissing).toBe(false)
    expect(parsed.issues).toEqual([])
  })

  it('roundtrips 500 random states exactly, including unicode and reserved characters', () => {
    const next = splitmix32(2024)
    for (let i = 0; i < 500; i++) {
      const state = randomState(next)
      const query = serializeState(state)
      const parsed = parseState(query, 1)
      expect(parsed.state).toEqual(state)
      expect(parsed.issues).toEqual([])
      expect(serializeState(parsed.state)).toBe(query)
      expect(parseState('?' + query, 1).state).toEqual(state)
    }
  })

  it('fills defaults for an empty query and reports the missing seed and hue', () => {
    const p = parseState('', 4242)
    expect(p.seedMissing).toBe(true)
    expect(p.hueMissing).toBe(true)
    expect(p.state.params.seed).toBe(4242)
    expect(p.state.params).toEqual({ ...DEFAULT_PARAMS, seed: 4242 })
    expect(p.state.texts).toEqual(DEFAULT_TEXTS)
    expect(p.state.v).toBe(1)
  })

  it('reads form-encoded plus signs as spaces and survives malformed escapes', () => {
    expect(parseState('v=1&s=1&t=Only+title&a=%E0%A4%A', 1).state.texts).toMatchObject({ title: 'Only title', author: '%E0%A4%A' })
  })

  it('an explicit empty text is kept empty, not replaced by the sample text', () => {
    const p = parseState('v=1&s=1&a=&t=Only+title', 1)
    expect(p.state.texts).toEqual({ author: '', title: 'Only title', subtitle: '', publisher: '' })
  })

  it('clamps and repairs invalid values', () => {
    const p = parseState('v=1&s=zzzzzzzzz&h=400&w=-5&g=abc&r=9x9&c=101&sa=-1&b=x&z=250', 77)
    expect(p.state.params).toEqual({ seed: 77, hue: 359, colors: 100, saturation: 0, brightness: DEFAULT_PARAMS.brightness, zoom: 100, swirl: 0, grain: DEFAULT_PARAMS.grain, ratio: '5x8' })
    expect(p.seedMissing).toBe(true)
    expect(p.issues.length).toBeGreaterThanOrEqual(9)
  })

  it('flags links from a newer version and renders them with the current one', () => {
    const p = parseState('v=2&s=1', 1)
    expect(p.state.v).toBe(1)
    expect(p.issues.some((m) => m.includes('newer'))).toBe(true)
    expect(parseState('v=abc&s=1', 1).state.v).toBe(1)
  })

  it('truncates over-long texts and strips control characters', () => {
    const long = 'x'.repeat(TEXT_MAX + 50)
    const p = parseState(`v=1&s=1&t=${long}&a=a%0Ab%09c`, 1)
    expect(p.state.texts.title.length).toBe(TEXT_MAX)
    expect(p.state.texts.author).toBe('a b c')
    expect(sanitizeState(p.state)).toEqual(p.state)
  })
})
