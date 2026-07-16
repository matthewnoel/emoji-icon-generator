# emoji-icon-generator

Generate a complete set of web icon assets from a single emoji:

```sh
npx emoji-icon-generator 🚀
```

That one command writes a favicon, PWA icons, an apple-touch-icon, and a web
manifest into your project's static assets directory, then prints the `<head>`
tags to paste into your app.

## Your emoji, exactly as you see it

The emoji is rasterized with **your machine's native emoji font** — Apple
Color Emoji on macOS, Segoe UI Emoji on Windows, Noto Color Emoji on Linux.
The icons look exactly like the emoji you picked, on every visitor's device,
because the artwork is baked into the assets at generation time (even
`favicon.svg` embeds the rendered image).

The flip side: run it on your dev machine, not in CI. A machine with no color
emoji font installed (most CI containers) renders a placeholder glyph. These
are static assets — generate once, commit them.

## Generated assets

| File | Purpose |
| --- | --- |
| `favicon.svg` | Modern favicon (embeds a 512px render of your emoji) |
| `favicon.ico` | Legacy/fallback favicon, 16+32+48px |
| `apple-touch-icon.png` | 180px iOS home-screen icon (solid background) |
| `icon-192.png`, `icon-512.png` | PWA icons |
| `icon-maskable-192.png`, `icon-maskable-512.png` | PWA maskable icons (safe-zone padding) |
| `manifest.webmanifest` | Web app manifest wired to the icons above |
| `emoji-icons.html` | The `<head>` tags below, saved so you can grab them anytime |

## Where the files go

The output directory is auto-detected from your project's `package.json`:

| Framework | Output |
| --- | --- |
| SvelteKit | `static/` |
| Vite / React / Next.js / Astro / CRA | `public/` |
| Anything else | current directory |

Override it with `-o`/`--out`:

```sh
npx emoji-icon-generator 🚀 -o assets/icons
```

## Wiring it up

After generating, the CLI prints the tags to paste — into `src/app.html` for
SvelteKit, `index.html` for Vite/React, your root layout for Next.js:

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="icon" href="/favicon.ico" sizes="48x48" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/manifest.webmanifest" />
<meta name="theme-color" content="#ffffff" />
```

The same block is saved next to the assets as `emoji-icons.html`.

## Options

```
-o, --out <dir>        Output directory (default: auto-detected)
    --bg <color>       Background for apple-touch-icon and maskable icons
                       (default: #ffffff)
    --theme-color <c>  theme_color for manifest and meta tag (default: --bg)
    --name <name>      App name for the manifest (default: package.json name)
    --base <path>      Public base path assets are served from (default: /)
    --dry-run          Preview without writing
-h, --help             Help
-v, --version          Version
```

Example with a dark background and brand color:

```sh
npx emoji-icon-generator 🔥 --bg "#1e293b" --theme-color "#f97316"
```

## Requirements

Node.js ≥ 18. Rendering uses [`@napi-rs/canvas`](https://github.com/Brooooooklyn/canvas)
(prebuilt binaries — nothing to install system-wide).

## Releasing (maintainers)

Every merge to `main` publishes to npm automatically (via trusted
publishing). The patch version is bumped for you; to ship a minor or major
release instead, set the new version in `package.json` in your PR. The
workflow tags the release and syncs the version back to `main`.

## License

[MIT](./LICENSE)
