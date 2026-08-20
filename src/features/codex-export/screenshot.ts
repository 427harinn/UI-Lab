function removeEditorOverlay(root: ParentNode): void {
  root.querySelectorAll('[data-uilab-editor-overlay]').forEach((node) => node.remove())
}

function waitForImage(image: HTMLImageElement): Promise<void> {
  return new Promise((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('The preview could not be rasterized as a PNG screenshot.'))
  })
}

/**
 * Rasterizes the trusted, same-origin iframe using SVG foreignObject.
 * This intentionally stays a small browser-native boundary instead of adding
 * a DOM-to-image dependency. Local previews must be self-contained for this
 * to work reliably; any failure rejects the whole Codex export.
 */
export async function captureIframeScreenshot(iframe: HTMLIFrameElement, width: number, height: number): Promise<Uint8Array> {
  const document = iframe.contentDocument
  if (!document?.body) throw new Error('The preview is not available for screenshot capture.')

  const body = document.body.cloneNode(true) as HTMLElement
  removeEditorOverlay(body)
  const styles = [...document.querySelectorAll('style')]
    .map((style) => `<style>${style.textContent ?? ''}</style>`)
    .join('')
  const bodyMarkup = new XMLSerializer().serializeToString(body)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;overflow:hidden;">${styles}${bodyMarkup}</div></foreignObject></svg>`

  const image = new Image()
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  await waitForImage(image)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('The browser could not create a screenshot canvas.')
  context.drawImage(image, 0, 0, width, height)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('The preview screenshot could not be encoded as PNG.')
  return new Uint8Array(await blob.arrayBuffer())
}
