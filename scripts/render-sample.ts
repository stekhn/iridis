// Renders cover backgrounds with the engine to PNG files, without a browser (run: npm run samples).
// Used to iterate on the look against the reference photos and to produce the README images.
//   npm run samples -- --seed k3f9z1 --hue 210 --colors 50 --saturation 50 --brightness 50 --zoom 50 --swirl 55 --grain 45 --ratio 5x8 --height 800 --out samples
//   npm run samples -- --sheet 12 --height 480        a contact sheet of 12 seeds
// Pure Node: the engine is DOM free and all imports carry .ts extensions for type stripping.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { argv } from 'node:process'
import { CoverRenderer } from '../engine/src/render.ts'
import { FIELD_WIDTH_FINAL } from '../engine/src/constants.ts'
import { isRatioId, sizeForHeight } from '../engine/src/ratios.ts'
import { seedFromBase36, seedToBase36 } from '../engine/src/state/codec.ts'
import { fnv1a32, hex32 } from '../engine/src/checksum.ts'
import type { RatioId, RenderJob } from '../engine/src/types.ts'
import { encodePng } from './png.ts'

export interface SampleArgs {
  seed: number
  hue: number
  colors: number
  saturation: number
  brightness: number
  zoom: number
  swirl: number
  grain: number
  ratio: RatioId
  height: number
  out: string
  sheet: number
  fieldWidth: number
}

export function parseArgs(args: string[]): SampleArgs {
  const get = (name: string): string | undefined => {
    const i = args.indexOf(`--${name}`)
    return i >= 0 ? args[i + 1] : undefined
  }
  const num = (name: string, fallback: number, min: number, max: number): number => {
    const raw = get(name)
    if (raw === undefined) return fallback
    const n = Number(raw)
    if (!Number.isFinite(n)) return fallback
    return Math.min(max, Math.max(min, Math.round(n)))
  }
  const rawSeed = get('seed')
  const seed = rawSeed ? (seedFromBase36(rawSeed) ?? 1) : 1
  const rawRatio = get('ratio')
  const ratio: RatioId = rawRatio && isRatioId(rawRatio) ? rawRatio : '5x8'
  return {
    seed,
    hue: num('hue', 330, 0, 359),
    colors: num('colors', 50, 0, 100),
    saturation: num('saturation', 50, 0, 100),
    brightness: num('brightness', 50, 0, 100),
    zoom: num('zoom', 50, 0, 100),
    swirl: num('swirl', 55, 0, 100),
    grain: num('grain', 45, 0, 100),
    ratio,
    height: num('height', 800, 16, 8000),
    out: get('out') ?? 'samples',
    sheet: num('sheet', 0, 0, 64),
    fieldWidth: num('field', FIELD_WIDTH_FINAL, 16, 2048),
  }
}

export function renderRgba(a: SampleArgs, renderer = new CoverRenderer()): { rgba: Uint8ClampedArray; width: number; height: number } {
  const { width, height } = sizeForHeight(a.ratio, a.height)
  const job: RenderJob = {
    version: 1,
    params: { seed: a.seed, hue: a.hue, colors: a.colors, saturation: a.saturation, brightness: a.brightness, zoom: a.zoom, swirl: a.swirl, grain: a.grain, ratio: a.ratio },
    width,
    height,
    textRects: [],
    fieldWidth: a.fieldWidth,
  }
  return { rgba: renderer.render(job), width, height }
}

function writeSample(a: SampleArgs, renderer: CoverRenderer): void {
  const t0 = performance.now()
  const { rgba, width, height } = renderRgba(a, renderer)
  const name = `iridis-${seedToBase36(a.seed)}-h${a.hue}-c${a.colors}-sa${a.saturation}-b${a.brightness}-z${a.zoom}-w${a.swirl}-g${a.grain}-${width}x${height}.png`
  writeFileSync(join(a.out, name), encodePng(rgba, width, height))
  console.log(`${name}  ${hex32(fnv1a32(rgba))}  ${(performance.now() - t0).toFixed(0)} ms`)
}

/** A grid of covers for different seeds (hue derived from the seed), to judge variety quickly. */
function writeSheet(a: SampleArgs, count: number): void {
  const renderer = new CoverRenderer()
  const { width, height } = sizeForHeight(a.ratio, a.height)
  const cols = Math.ceil(Math.sqrt(count))
  const rows = Math.ceil(count / cols)
  const gap = 8
  const sheetW = cols * width + (cols + 1) * gap
  const sheetH = rows * height + (rows + 1) * gap
  const sheet = new Uint8ClampedArray(sheetW * sheetH * 4).fill(32)
  for (let i = 0; i < count; i++) {
    const seed = (a.seed + i * 0x9e3779b9) >>> 0
    const hue = seed % 360
    const { rgba } = renderRgba({ ...a, seed, hue }, renderer)
    const ox = gap + (i % cols) * (width + gap)
    const oy = gap + Math.floor(i / cols) * (height + gap)
    for (let y = 0; y < height; y++) {
      sheet.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), ((oy + y) * sheetW + ox) * 4)
    }
    for (let p = 3; p < sheet.length; p += 4) sheet[p] = 255
    console.log(`#${i}  seed ${seedToBase36(seed)}  hue ${hue}`)
  }
  const name = `sheet-${seedToBase36(a.seed)}-c${a.colors}-sa${a.saturation}-b${a.brightness}-z${a.zoom}-w${a.swirl}-g${a.grain}-${a.ratio}.png`
  writeFileSync(join(a.out, name), encodePng(sheet, sheetW, sheetH))
  console.log(name)
}

function main(): void {
  const a = parseArgs(argv.slice(2))
  mkdirSync(a.out, { recursive: true })
  if (a.sheet > 0) writeSheet(a, a.sheet)
  else writeSample(a, new CoverRenderer())
}

if (argv[1]?.endsWith('render-sample.ts')) main()
