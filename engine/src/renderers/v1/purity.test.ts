// Guards the determinism contract: renderer v1 may only use operations that ECMAScript defines
// exactly. Transcendental Math functions, exponentiation, Date and Math.random are banned.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const FORBIDDEN = /Math\.(sin|cos|tan|atan2?|asin|acos|sinh|cosh|tanh|pow|exp|expm1|log|log2|log10|log1p|cbrt|hypot|random)\b|\*\*|\bDate\b|toFixed\(/

function listTs(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...listTs(p))
    else if (name.endsWith('.ts') && !name.endsWith('.test.ts')) out.push(p)
  }
  return out
}

describe('renderer v1 purity', () => {
  const dir = new URL('.', import.meta.url).pathname
  for (const file of listTs(dir)) {
    it(`${file.slice(dir.length)} uses only exact arithmetic`, () => {
      const src = readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '')
      const hit = src.match(FORBIDDEN)
      expect(hit, hit ? `found ${hit[0]}` : undefined).toBeNull()
    })
  }
})
