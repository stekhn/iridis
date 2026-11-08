import type { CoverParams, CoverTexts } from '../types.ts'

export const DEFAULT_PARAMS: CoverParams = {
  seed: 0x5eed1,
  hue: 330,
  colors: 50,
  saturation: 50,
  brightness: 50,
  zoom: 50,
  swirl: 55,
  grain: 45,
  ratio: '5x8',
}

/** Fictional sample texts, so the first visit shows a finished cover. */
export const DEFAULT_TEXTS: CoverTexts = {
  author: 'Mira Sandoval',
  title: 'The Weight of Light',
  subtitle: '',
  publisher: 'Iridis Editions',
}
