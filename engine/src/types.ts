// Shared engine types. The engine is pure TypeScript: no DOM, no Node, no side effects.

/** Aspect ratio presets. The id is what appears in the URL (`r=`). */
export type RatioId = '5x8' | '2x3' | 'din' | '3x4' | '1x1'

/** The generator inputs. Together with the texts they fully define a cover. */
export interface CoverParams {
  /** uint32 seed; everything random derives from it */
  seed: number
  /** lead hue in degrees, 0..359 */
  hue: number
  /** how far the bands sweep through the colour loop, 0..100 */
  colors: number
  /** colour saturation, 0..100 (50 = the palette as designed) */
  saturation: number
  /** brightness, 0..100 (50 = as designed; below darkens, above lifts toward white) */
  brightness: number
  /** zoom of the colour field around the cover centre, 0..100 (50 = 1x, 0 = 0.5x, 100 = 2x) */
  zoom: number
  /** domain warp strength, 0..100 */
  swirl: number
  /** grain strength, 0..100 */
  grain: number
  ratio: RatioId
}

export interface CoverTexts {
  author: string
  title: string
  subtitle: string
  publisher: string
}

/** The full state as encoded in the URL. `v` selects the renderer and layout rules. */
export interface CoverState {
  v: number
  params: CoverParams
  texts: CoverTexts
}

/** Rectangle in cover units: the cover is 1 wide and `ratio` high, origin top left. */
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** One background render. Width and height are output pixels. */
export interface RenderJob {
  version: number
  params: CoverParams
  width: number
  height: number
  /** text rectangles (cover units) that the legibility guard protects */
  textRects: Rect[]
  /** width of the low-res field grid; the final preview and the export use the same value */
  fieldWidth: number
}
