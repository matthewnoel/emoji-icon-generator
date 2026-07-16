export interface ManifestOptions {
  name: string
  base: string
  themeColor: string
  backgroundColor: string
}

export function buildManifest(options: ManifestOptions): string {
  const { name, base, themeColor, backgroundColor } = options
  const manifest = {
    name,
    short_name: name,
    start_url: '/',
    display: 'standalone',
    theme_color: themeColor,
    background_color: backgroundColor,
    icons: [
      { src: `${base}icon-192.png`, sizes: '192x192', type: 'image/png' },
      { src: `${base}icon-512.png`, sizes: '512x512', type: 'image/png' },
      {
        src: `${base}icon-maskable-192.png`,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: `${base}icon-maskable-512.png`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
  return JSON.stringify(manifest, null, 2) + '\n'
}
