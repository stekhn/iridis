/** Short notes below the app: what the link holds, offline use, formats. */
export function HelpSection() {
  return (
    <section id="about" className="mt-12 border-t border-line pt-8 text-sm text-muted" aria-labelledby="about-heading">
      <h2 id="about-heading" className="text-base font-bold text-ink">
        About
      </h2>
      <div className="mt-3 grid gap-6 md:grid-cols-3">
        <div>
          <h3 className="font-medium text-ink">The link is the file</h3>
          <p className="mt-1">
            Everything that defines a cover (seed, sliders, texts) is stored in the address bar. Copy the link and anyone
            opening it, on any device, gets the same image. The generator uses only exact arithmetic, so nothing depends on
            the browser or the graphics card.
          </p>
        </div>
        <div>
          <h3 className="font-medium text-ink">Works offline</h3>
          <p className="mt-1">
            Iridis is a static app with no server logic. Install it from the browser menu and it keeps working without a
            connection, fonts included. Nothing you type leaves your device.
          </p>
        </div>
        <div>
          <h3 className="font-medium text-ink">Export</h3>
          <p className="mt-1">
            PNG is lossless, JPEG and WebP are smaller, PDF carries the text as real, selectable text with the font embedded
            and the background as an image. Colours are sRGB. The file name contains the seed so a file can be traced back
            to its link.
          </p>
        </div>
      </div>
    </section>
  )
}
