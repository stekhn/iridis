import { useEffect, useState } from 'react'
import { loadCoverFonts } from '../lib/fonts'

export type FontStatus = 'loading' | 'ready' | 'failed'

/** Loads the cover fonts once; the preview only draws text once they are ready. */
export function useFonts(): FontStatus {
  const [status, setStatus] = useState<FontStatus>('loading')
  useEffect(() => {
    let alive = true
    void loadCoverFonts().then((ok) => {
      if (alive) setStatus(ok ? 'ready' : 'failed')
    })
    return () => {
      alive = false
    }
  }, [])
  return status
}
