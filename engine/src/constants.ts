/** Field grid width while a slider is being dragged (fast, approximate). */
export const FIELD_WIDTH_DRAFT = 160
/** Field grid width for the settled preview and for every export, so both sample the same grid. */
export const FIELD_WIDTH_FINAL = 512
/** Grain is cached per output size up to this many pixels; larger renders compute it per band. */
export const GRAIN_CACHE_MAX_PX = 2_500_000
/** Maximum length of each text field (characters). */
export const TEXT_MAX = 200
/** Cover text colour: a warm off-white, as on the reference covers. */
export const TEXT_COLOR = '#f3f1e6'
export const TEXT_COLOR_RGB: readonly [number, number, number] = [0xf3 / 255, 0xf1 / 255, 0xe6 / 255]
