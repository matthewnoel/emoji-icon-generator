/**
 * favicon.svg wrapping a raster render of the emoji as a data URI, so every
 * viewer sees the emoji exactly as it rendered on the generating machine
 * (rather than their own platform's emoji font).
 */
export function buildSvgFavicon(png: Buffer, size: number): string {
  const dataUri = `data:image/png;base64,${png.toString('base64')}`
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    `<image width="${size}" height="${size}" href="${dataUri}"/>` +
    `</svg>\n`
  )
}
