// The cover font is bundled (no CDN). It is loaded through the FontFace API so the preview knows
// when it may draw text, and the same bytes are fetched again for embedding into the PDF.
import boldUrl from '../assets/fonts/HankenGrotesk-Bold.ttf?url'
import mediumUrl from '../assets/fonts/HankenGrotesk-Medium.ttf?url'

export const COVER_FONT_FAMILY = 'Hanken Grotesk'

const URLS = { bold: boldUrl, medium: mediumUrl } as const
export type FontWeightKey = keyof typeof URLS

let loading: Promise<boolean> | null = null

/** Resolves true when both weights are usable by canvas text. Never rejects. */
export function loadCoverFonts(): Promise<boolean> {
  if (!loading) {
    loading = (async () => {
      try {
        const faces = [
          new FontFace(COVER_FONT_FAMILY, `url(${URLS.bold})`, { weight: '700' }),
          new FontFace(COVER_FONT_FAMILY, `url(${URLS.medium})`, { weight: '500' }),
        ]
        const loaded = await Promise.all(faces.map((f) => f.load()))
        for (const f of loaded) document.fonts.add(f)
        return true
      } catch (err) {
        console.error('cover fonts failed to load', err)
        return false
      }
    })()
  }
  return loading
}

export async function fetchFontBytes(weight: FontWeightKey): Promise<ArrayBuffer> {
  const res = await fetch(URLS[weight])
  if (!res.ok) throw new Error(`Could not load the ${weight} font (${res.status})`)
  return res.arrayBuffer()
}
