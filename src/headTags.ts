export interface HeadTagsOptions {
  base: string
  themeColor: string
}

export function buildHeadTags(options: HeadTagsOptions): string {
  const { base, themeColor } = options
  return [
    `<link rel="icon" href="${base}favicon.svg" type="image/svg+xml" />`,
    `<link rel="icon" href="${base}favicon.ico" sizes="48x48" />`,
    `<link rel="apple-touch-icon" href="${base}apple-touch-icon.png" />`,
    `<link rel="manifest" href="${base}manifest.webmanifest" />`,
    `<meta name="theme-color" content="${themeColor}" />`,
  ].join('\n')
}
