# Iridis

Generate book cover backgrounds in the style of iridescent, grainy colour gradients, entirely in
your browser. Set a few sliders, type the cover texts, copy the link, export for print. No backend,
no account, no tracking.

<p>
<img src="docs/screenshot.jpg" width="720" alt="Iridis in the browser: a pink and violet cover with white grotesk type beside the controls">
</p>

Every cover is a pure function of its link. `?v=1&s=w3lggm&h=335&c=50&sa=50&b=50&z=50&w=55&g=45&r=5x8&a=…&t=…`
opens the same picture, with the same texts, on any device and at any time.

<p>
<img src="docs/samples.jpg" width="720" alt="Twelve generated backgrounds with different seeds and lead colours">
</p>

## Features

- **Generator**: a soft, mesh-like colour field with curved spectral bands, one lead colour, and a
  fine, even grain. Nothing is loaded from image files; the cover is computed.
- **Eight controls**: lead colour, colours (how far the bands sweep through the spectrum),
  saturation, brightness, zoom, swirl, grain, aspect ratio. Plus a Shuffle button for a new composition. Everything
  else (band placement, line widths, which side the author name sits on) follows from the seed.
- **Typography**: author, title, subtitle and publisher in a grotesk, set the way the reference
  covers do it: given name and family name in bold on opposite sides, title below in the same
  size but a lighter weight on the same line grid, publisher small in the bottom corner. Empty fields are simply skipped. Nothing is
  positioned by hand; long texts wrap and, if needed, shrink.
- **Reproducible**: the complete state lives in the URL, versioned. The renderer uses only exact
  arithmetic, so the background is bit-identical across browsers and devices.
- **Export**: PNG (default, lossless), JPEG and WebP with a quality slider, and PDF with the text as
  real, selectable text and the font embedded. Screen and print sizes, pixel dimensions shown
  before you export, seed in the file name. The text can be left out to export the background
  alone.
- **Progressive Web App**: installable, fully offline after the first visit, fonts included.
- **Accessible**: keyboard operable, labelled controls, respects `prefers-reduced-motion`, light
  and dark interface theme.

## Quick start

Node 22 (see `.nvmrc`).

```bash
npm install
npm run dev        # dev server at http://localhost:5173
npm run build      # static site in dist/ (served under /iridis/)
npm run preview    # serve dist/ locally at http://localhost:4173/iridis/
npm test           # engine, layout and URL codec tests (Vitest)
npm run lint       # oxlint
npm run samples    # render backgrounds to PNG without a browser (see below)
```

The build is a plain static site. There are no runtime network calls at all; even the fonts ship
with the app.

## How it works

```
URL ──parse──▶ state ──▶ worker: field → palette → grain → composite ──▶ canvas ──▶ text on top
                  │                                                          │
                  └──────────────── layout (cover units) ────────────────────┘
```

1. **State.** `engine/src/state/codec.ts` turns the query string into a `CoverState` (seed,
   hue, swirl, grain, ratio, four texts) and back. Every key is always written, in a fixed order,
   with the version first.
2. **Layout.** `engine/src/renderers/v1/layout.ts` places the texts in cover units (the cover is
   1 wide and `ratio` high). It measures text with advance-width tables extracted from the font
   files, not with the browser, so line breaks are the same everywhere. The bounding boxes of the
   text go to the renderer.
3. **Background.** A Web Worker runs `engine/src/render.ts`. Four stages, each cached by the
   inputs it depends on, so moving the grain slider never recomputes the colour field:
   - *field*: two or three large, rotated, soft elliptical "lenses" plus low-frequency value
     noise. The Zoom slider scales the field about the cover centre (0.5x to 2x), the Swirl
     slider twists the sampling domain around a seed-chosen centre (a rotation
     built from the rational parametrisation `(1 - t²)/(1 + t²), 2t/(1 + t²)`, so no trigonometry)
     and adds a noise warp on top; at zero the lenses are clean ellipses, at full strength they
     fold into ribbons. Where the field is flat you see one colour; where it rises steeply the
     palette sweeps through part of the spectrum and a band appears. One lens per cover may carry
     a thin line along its edge, like the fine interference lines on a soap film.
   - *palette*: a closed Catmull-Rom loop through eight key colours taken from the reference
     covers (pink, mauve, dark violet, blue, teal, green, yellow, orange). The Lead colour slider
     rotates the loop so that the flat regions show that colour, the Colours slider scales how far
     the field travels along the loop (few hues or the whole rainbow), and the Saturation slider
     grades the result from pastel to vivid (50 is the palette as designed), and the Brightness
     slider darkens or lifts toward white. A second noise field modulates lightness for shadows
     and highlights.
   - *grain*: two octaves of value noise on a virtual grid fixed to the cover, not to the pixels.
     Screen and print show the same grain character; print just resolves it finer.
   - *composite*: bicubic upsampling of the low-res colour field to the output size, the
     legibility guard (a soft, wide darkening around the text boxes, only when the background
     under them is very light), the grain, and the RGBA bytes. Exports stream in row bands.
4. **Text.** The main thread draws the layout with canvas `fillText` on top of the background.
   Kerning and ligatures are switched off so the glyph advances match the width tables.
5. **Export.** The same worker renders the chosen size band by band into a full-size canvas, the
   text is drawn on top, and the browser encodes PNG, JPEG or WebP. For PDF, the background
   becomes an embedded JPEG and each text line is drawn with `pdf-lib` using the embedded cover
   font at the same positions.

## Decisions

**Framework and tooling.** Vite, React, TypeScript, Tailwind v4, Vitest, oxlint; the same stack
and visual language as the sibling project Punchpath, so both stay familiar. The engine under
`engine/` is framework-free TypeScript with no DOM and no Node types; it is imported through the
`@engine` alias and runs unchanged in the worker, in tests and in the Node sample script.

**CPU rendering, not WebGL.** A fragment shader would be faster, but GPUs differ in precision and
in how they implement `sin`, `pow` and friends, so the same link could produce slightly different
pixels on different machines. The renderer therefore runs in a Web Worker on the CPU and uses only
operations that ECMAScript defines exactly: `+ - * /`, `Math.sqrt`, `floor`, `abs`, `min`, `max`,
`Math.imul` and bit shifts, plus integer hashes. No `Math.sin`, `cos`, `pow`, `exp`, `cbrt` or
`random`. A test (`purity.test.ts`) scans the v1 sources for banned calls. The result: the
background bytes are identical in every JavaScript engine. Only two things remain browser
specific and are documented as such: text anti-aliasing and the image encoders.

**Interactive performance.** While a slider moves, the preview renders at a small pixel budget and
a coarse field grid and is upscaled; 150 ms after the last change the full-resolution frame
replaces it. One job is in flight and at most one is pending (the latest wins), so a fast drag
never queues stale work. Typing only redraws the text from the cached background frame.

**Field, noise and palette.** Value noise with integer hashing (`hash2`, `splitmix32`) is simple,
fast and exact. The "lens" composition is the smallest set of ingredients that reproduces the
reference look (broad fields, curved bands, occasional thin lines) and every one of its random
draws comes from the seed in a fixed order. The palette is a designed colour loop rather than a
cosine rainbow, because the reference covers have dark violets and bright yellows that a uniform
rainbow cannot give.

**Text measurement.** Browsers kern and position text slightly differently, and `measureText` is
not available in the worker or in Node. The layout therefore measures with committed advance-width
tables (`engine/src/renderers/v1/fonts/*.metrics.ts`, generated by `npm run font-metrics` from the
TTF files). Canvas and PDF disable kerning and ligatures to match, and right-aligned lines are
anchored at the right margin in both, so residual sub-pixel differences cannot move a line.

**URL encoding.** A readable query string with short keys, every value always present, version
first. It is easy to hand-edit, easy to diff, and it survives chat clients and e-mail. The seed
is a 32-bit integer in base36 (at most seven characters). Texts are percent-encoded; parsing is
forgiving (values are clamped, unknown ratios fall back, a broken seed gets a fresh one) and
reports what it repaired.

**Versioning.** `v=1` names the renderer *and* the layout rules under `engine/src/renderers/v1/`.
Any change that would alter the pixels of an existing link (a different hash, palette, lens
rule, margin or font) must become `v2` in a new folder, selected by `getRenderer(version)`; v1
stays as it is. Golden checksums in `engine/test/fixtures/render_golden.json` fail the test suite
when v1 changes by accident. A link with a newer version than the app knows is rendered with the
latest renderer and shows a notice.

**Export formats.** PNG is the default because it is lossless and universal. JPEG and WebP are
offered for sharing; WebP is feature-detected (Safari cannot encode it, so the option is disabled
there with a note). The PDF embeds the background as a JPEG at quality 0.95 because a lossless
background full of grain would be tens of megabytes without any visible gain; the text is real,
with the subsetted font embedded, and the page size is the pixel size at 300 dpi. Colour is sRGB
throughout; CMYK conversion is a job for the print shop's workflow.

**No SVG export.** The look is a per-pixel colour field with grain. SVG has no mesh gradient
primitive in browsers (SVG 2 mesh gradients were never shipped), and an `feTurbulence` filter
stack would be a different algorithm whose output could not match the screen, which breaks the
promise that the export is what you see. The only faithful SVG would wrap the raster image, which
defeats the purpose. So SVG is left out on purpose.

**Fonts.** Hanken Grotesk (SIL Open Font License, see `src/assets/fonts/OFL.txt`), the closest open
match to the Helvetica-style grotesk on the reference covers. Only two cuts are shipped (about
74 KB each): Bold for the author, Medium for title, subtitle and publisher. They are loaded
through the FontFace API, and the same bytes are embedded into the PDF.

**PWA.** `vite-plugin-pwa` generates a Workbox service worker that precaches every build asset,
including the worker, the fonts and the lazily loaded PDF chunk. Navigation requests fall back to
`index.html`, and the query string is ignored for that lookup, so share links open offline too.

## Project structure

```
engine/
  src/types.ts, constants.ts, ratios.ts, filename.ts, checksum.ts
  src/state/codec.ts, defaults.ts        URL state (versioned), sample texts
  src/render.ts                          CoverRenderer: stage caches, whole frames or row bands
  src/renderers/index.ts                 version → renderer
  src/renderers/v1/                      everything that defines a v1 cover (frozen on release)
    prng, math, noise, palette, field, gradient, grain, legibility, sampler, composite
    layout.ts, fonts/*.metrics.ts, fonts/measure.ts
  test/fixtures/render_golden.json       checksums that lock v1
src/
  render.worker.ts, renderClient.ts      Comlink worker and its main-thread client
  hooks/                                 state, URL sync, fonts, preview scheduling
  lib/                                   text drawing, export (raster, PDF), probes, helpers
  components/                            preview, controls, text fields, export panel, header
  assets/fonts/                          Hanken Grotesk Bold and Medium (OFL)
scripts/
  render-sample.ts                       engine → PNG from Node, for iterating on the look
  extract-font-metrics.ts                TTF → advance-width tables
  make-icons.sh                          SVG → PWA icons (rsvg-convert)
public/                                  favicon, icons
```

## Tests

`npm test` runs Vitest in the Node environment, no DOM needed:

- **Determinism**: known-answer values for the PRNG and hash, noise range and continuity, the
  purity scan for banned Math functions, golden FNV-1a checksums of rendered frames, and checks
  that banded rendering, stage caching and resolution changes do not alter the result.
- **URL codec**: canonical serialisation, 500 fuzzed roundtrips with unicode and reserved
  characters, clamping and repair of invalid values, version handling.
- **Sliders**: the Colours slider measurably adds distinct hues, the Saturation slider adds
  chroma and the Brightness slider raises luminance, so each control has a visible effect.
- **Layout**: author split, both side variants, wrapping and shrinking, empty fields, subtitle and
  publisher placement, and that the protected rectangles cover every line.
- **Fonts**: the width tables cover the needed characters and agree with fontkit's unkerned
  layout within 0.5%.

## Samples without a browser

`scripts/render-sample.ts` runs the engine in Node and writes PNGs, which is how the look was tuned
against the reference photos:

```bash
npm run samples -- --seed 1kpj5dg --hue 330 --colors 50 --saturation 50 --brightness 50 --zoom 50 --swirl 55 --grain 45 --ratio 5x8 --height 800 --out samples
npm run samples -- --sheet 12 --height 400 --out samples     # a contact sheet of 12 seeds
```

## Known limitations

- The background is bit-exact everywhere; the rasterised text is not, because browsers
  anti-alias glyphs differently. Line breaks and positions are identical, the edge pixels of the
  letters are not.
- WebP export needs a browser that can encode WebP (Chrome, Edge, Firefox). Safari cannot.
- Very large exports (A4 height at 300 dpi, up to 12 megapixels) take a few seconds and need a
  few hundred megabytes of memory; the app checks that the canvas can be allocated and reports
  if a size is too large for the device.

## Deployment

Pushes to `main` build and deploy to GitHub Pages through `.github/workflows/deploy.yml`. The
Vite `base` is `/iridis/` for builds and previews (set it to `/` for a user site or a custom
domain). The workflow runs the tests before the build.

## Acknowledgements

- [Hanken Grotesk](https://github.com/marcologous/hanken-grotesk) by Alfredo Marco Pradil, SIL Open Font License 1.1.
- [pdf-lib](https://pdf-lib.js.org/) and [fontkit](https://github.com/foliojs/fontkit) for the PDF export with embedded fonts.
- [Comlink](https://github.com/GoogleChromeLabs/comlink) for the worker bridge, [Tabler Icons](https://tabler.io/icons) for the icons,
  [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) for the service worker.
- The cover series published by Tre Oci, whose photographed covers were the visual reference.
