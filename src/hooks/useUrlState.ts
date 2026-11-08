// The URL is the save file. On load the query string becomes the state; afterwards every change
// is written back with history.replaceState (debounced, only when it differs, wrapped in
// try/catch because Safari rate-limits the call). Back/forward re-reads the URL.
import { useEffect } from 'react'
import { parseState, sanitizeState, serializeState, type CoverState } from '@engine'
import { randomSeed } from '../lib/randomSeed'

export interface InitialState {
  state: CoverState
  issues: string[]
}

/** State for the first render: the link if there is one, else a fresh random cover. */
export function initialStateFromUrl(search: string = location.search): InitialState {
  const seed = randomSeed()
  const parsed = parseState(search, seed)
  let { state } = parsed
  // A first visit without a link gets a random lead colour too, so no two visitors start alike.
  if (parsed.seedMissing && parsed.hueMissing) {
    state = { ...state, params: { ...state.params, hue: seed % 360 } }
  }
  return { state, issues: parsed.issues }
}

export function shareUrl(state: CoverState): string {
  const url = new URL(location.href)
  url.search = serializeState(sanitizeState(state))
  url.hash = ''
  return url.toString()
}

export function useUrlSync(state: CoverState, replace: (s: CoverState) => void): void {
  useEffect(() => {
    const t = setTimeout(() => {
      const search = '?' + serializeState(sanitizeState(state))
      if (location.search === search) return
      try {
        history.replaceState(null, '', search + location.hash)
      } catch {
        /* Safari throws after too many calls in a short time; the next change retries */
      }
    }, 300)
    return () => clearTimeout(t)
  }, [state])

  useEffect(() => {
    const onPop = (): void => replace(parseState(location.search, randomSeed()).state)
    addEventListener('popstate', onPop)
    return () => removeEventListener('popstate', onPop)
  }, [replace])
}
