# Architecture and decisions

## Pipeline

1. **State.** `engine/src/state/codec.ts` turns the query string into a `CoverState` and back.
2. **Layout.** `engine/src/renderers/v1/layout.ts` places the texts in cover units (width 1,
   height = ratio) and hands the text boxes to the renderer.
3. **Background.** A Web Worker runs `engine/src/render.ts` in four cached stages:
   - *field*: two or three large, soft elliptical lenses plus low-frequency value noise; Zoom
     scales the domain, Swirl twists it around a centre and adds a noise warp.
   - *palette*: a closed Catmull-Rom loop through eight key colours; Lead colour rotates it,
     Colours scales how far the field travels along it, Saturation and Brightness grade it.
   - *grain*: value noise on a grid fixed to the cover, so screen and print show the same grain.
   - *composite*: bicubic upsampling, legibility guard, grain, RGBA bytes, in row bands.
4. **Text.** Canvas `fillText` on the main thread, kerning and ligatures off.
5. **Export.** Same worker at the export size, text on top, browser encoder; PDF via pdf-lib.

## Determinism

- CPU, not WebGL: GPUs differ in precision and in their `sin`, `pow` and friends.
- Renderer v1 uses only operations ECMAScript defines exactly: `+ - * /`, `Math.sqrt`, `floor`,
  `abs`, `min`, `max`, `Math.imul`, bit shifts, integer hashes. Rotations use the rational
  parametrisation `(1 - t²)/(1 + t²), 2t/(1 + t²)`. `purity.test.ts` scans the sources.
- Text is measured with advance-width tables extracted from the TTFs (`npm run font-metrics`),
  not with `measureText`. Canvas and PDF disable kerning and ligatures to match.
- Browser specific and documented as such: glyph anti-aliasing and the image encoders.

## URL scheme

```
?v=1&s=<seed>&h=<hue>&c=<colours>&sa=<saturation>&b=<brightness>&z=<zoom>&w=<swirl>&g=<grain>
  &r=<ratio>&a=<author>&t=<title>&st=<subtitle>&p=<publisher>
```

- Every key is always written, in this order. Seed is uint32 in base36. Percent values are
  0 to 100, hue 0 to 359, ratio one of `5x8`, `2x3`, `din`, `3x4`, `1x1`.
- Parsing is forgiving: values are clamped, unknown ratios fall back, a broken seed gets a fresh
  one, texts are capped at 200 characters. Repairs are reported in the UI.
- A link without a seed gets a random seed and a lead colour derived from it.

## Versioning

`v=1` names the renderer and the layout rules in `engine/src/renderers/v1/`. Any change that
alters the pixels of an existing link (hash, palette, lens rules, margins, font) becomes `v2` in a
new folder, selected by `getRenderer(version)`. Golden checksums in
`engine/test/fixtures/render_golden.json` fail the suite when v1 changes by accident
(`UPDATE_GOLDEN=1 npm test` regenerates them before the first release). Links from a newer
version render with the latest renderer and show a notice.

## Export

| Format | Notes |
|---|---|
| PNG | default, lossless |
| JPEG, WebP | quality slider; WebP is feature-detected and disabled where the browser cannot encode it (Safari) |
| PDF | background as JPEG q0.95, text as real text with the subsetted font embedded, page size = pixels at 300 dpi, metadata with seed and link |

Sizes: Screen 1600 px, A5 height 2480 px, A4 height 3508 px (300 dpi). The largest case
(1:1 at 3508 px, 12.3 MP) stays under the iOS canvas limit; the app checks that the canvas can be
allocated. Exports stream in row bands with a progress bar. "Include the text" off exports the
background only (no legibility guard, no fonts in the PDF, `-background` in the file name).

**No SVG.** Browsers have no mesh gradient primitive, an `feTurbulence` filter stack would be a
different algorithm that cannot match the screen, and wrapping the raster defeats the purpose.

## Performance

While a slider moves, the preview renders at a small pixel budget and a coarse field grid; 150 ms
after the last change a full-resolution frame replaces it. One job in flight, at most one pending.
Typing only redraws the text from the cached frame unless the text box moved.

## PWA

`vite-plugin-pwa` precaches every build asset including the worker, the fonts and the lazy pdf
chunk. Navigations fall back to `index.html`; the query string is ignored for that lookup, so
share links open offline.

## Fonts

Hanken Grotesk (SIL OFL, `src/assets/fonts/OFL.txt`): Bold for the author, Medium for title,
subtitle and publisher. Loaded through the FontFace API, the same bytes are embedded into the PDF.

## Tests

`npm test` runs Vitest in Node: PRNG and hash known answers, noise range and continuity, the
purity scan, golden checksums, band and cache equivalence, resolution and zoom invariance, slider
effects (colours, saturation, brightness), the URL codec (500 fuzzed roundtrips), the layout
rules, and the width tables against fontkit.

## Sample renders

```bash
npm run samples -- --seed 1kpj5dg --hue 330 --colors 50 --saturation 50 --brightness 50 --zoom 50 --swirl 55 --grain 45 --ratio 5x8 --height 800 --out samples
npm run samples -- --sheet 12 --height 400 --out samples
```

## Known limitations

- Glyph edge pixels differ between browsers; positions and line breaks do not.
- WebP export needs a browser that can encode WebP.
- A4-size exports take a few seconds and a few hundred megabytes of memory.
