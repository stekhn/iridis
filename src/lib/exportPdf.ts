// PDF export with pdf-lib (lazy-imported so it stays out of the main bundle): the background as
// an embedded JPEG, the text as real text set in the embedded, subsetted cover font, at the same
// positions as on screen. The page size is the pixel size at 300 dpi.
import { seedToBase36, TEXT_COLOR_RGB } from '@engine'
import { canvasToBlob } from './canvasCapabilities'
import { fetchFontBytes } from './fonts'
import { releaseCanvas, renderBackgroundCanvas, type BackgroundOptions } from './exportRaster'

export const PDF_DPI = 300
const PDF_JPEG_QUALITY = 0.95

export interface PdfOptions extends BackgroundOptions {
  shareUrl: string
}

export async function exportPdf(o: PdfOptions): Promise<Blob> {
  const canvas = await renderBackgroundCanvas(o)
  let jpeg: Blob
  try {
    o.onProgress({ phase: 'encode', fraction: 0 })
    jpeg = await canvasToBlob(canvas, 'image/jpeg', PDF_JPEG_QUALITY)
  } finally {
    releaseCanvas(canvas)
  }

  const [{ PDFDocument, rgb }, fontkit] = await Promise.all([import('pdf-lib'), import('@pdf-lib/fontkit')])
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit.default)

  // Only the weights that appear on the page are fetched and embedded (none for a background-only export).
  const needsBold = o.layout.lines.some((l) => l.weight === 'bold')
  const needsMedium = o.layout.lines.some((l) => l.weight === 'medium')
  const [boldBytes, mediumBytes] = await Promise.all([
    needsBold ? fetchFontBytes('bold') : null,
    needsMedium ? fetchFontBytes('medium') : null,
  ])
  const embed = { subset: true, features: { liga: false, kern: false } }
  const bold = boldBytes ? await doc.embedFont(boldBytes, embed) : null
  const medium = mediumBytes ? await doc.embedFont(mediumBytes, embed) : null

  const pageW = (o.width / PDF_DPI) * 72
  const pageH = (o.height / PDF_DPI) * 72
  const page = doc.addPage([pageW, pageH])
  const image = await doc.embedJpg(await jpeg.arrayBuffer())
  page.drawImage(image, { x: 0, y: 0, width: pageW, height: pageH })

  const color = rgb(TEXT_COLOR_RGB[0], TEXT_COLOR_RGB[1], TEXT_COLOR_RGB[2])
  const unit = pageW // the layout's cover width is 1
  for (const line of o.layout.lines) {
    const font = line.weight === 'bold' ? bold : medium
    if (!font) continue
    const size = line.size * unit
    const x = line.align === 'left' ? line.x * unit : line.x * unit - font.widthOfTextAtSize(line.text, size)
    page.drawText(line.text, { x, y: pageH - line.baseline * unit, size, font, color })
  }

  const { texts, params } = o.state
  doc.setTitle(texts.title.trim() || 'Iridis cover')
  if (texts.author.trim()) doc.setAuthor(texts.author.trim())
  if (texts.subtitle.trim()) doc.setSubject(texts.subtitle.trim())
  doc.setCreator('Iridis')
  doc.setProducer('Iridis (pdf-lib)')
  doc.setKeywords([`iridis-seed:${seedToBase36(params.seed)}`, o.shareUrl])
  doc.setCreationDate(new Date())
  doc.setModificationDate(new Date())

  const bytes = await doc.save()
  return new Blob([bytes as BlobPart], { type: 'application/pdf' })
}
