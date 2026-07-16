#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import { detectProject } from './detect.js'
import { validateEmoji } from './emoji.js'
import { buildHeadTags } from './headTags.js'
import { packIco } from './ico.js'
import { buildManifest } from './manifest.js'
import { renderEmojiPng } from './render.js'
import { buildSvgFavicon } from './svg.js'

const HELP = `emoji-icon-generator — generate web icon assets from an emoji

The emoji is rendered with THIS machine's emoji font, so the icons look
exactly like the emoji you see here.

Usage:
  npx emoji-icon-generator <emoji> [options]

Options:
  -o, --out <dir>        Output directory (default: auto-detected from your
                         framework — SvelteKit: static/, Vite/React/Next/Astro:
                         public/, otherwise the current directory)
      --bg <color>       Background color for apple-touch-icon and maskable
                         icons (default: #ffffff)
      --theme-color <c>  theme_color for the manifest and meta tag
                         (default: same as --bg)
      --name <name>      App name for the manifest (default: package.json name)
      --base <path>      Public base path the assets are served from
                         (default: /)
      --dry-run          Show what would be written without writing anything
  -h, --help             Show this help
  -v, --version          Show version

Generated assets:
  favicon.svg, favicon.ico, apple-touch-icon.png, icon-192.png, icon-512.png,
  icon-maskable-192.png, icon-maskable-512.png, manifest.webmanifest, and
  emoji-icons.html (the <head> tags to paste into your app).

Example:
  npx emoji-icon-generator 🚀 -o static --bg "#1e293b"
`

function fail(message: string): never {
  console.error(`error: ${message}`)
  console.error(`Run with --help for usage.`)
  process.exit(1)
}

function ownVersion(): string {
  const pkgPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'package.json')
  return JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version
}

function main(argv: string[]): void {
  let parsed
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        out: { type: 'string', short: 'o' },
        bg: { type: 'string' },
        'theme-color': { type: 'string' },
        name: { type: 'string' },
        base: { type: 'string' },
        'dry-run': { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'v' },
      },
    })
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err))
  }
  const { values, positionals } = parsed

  if (values.help) {
    console.log(HELP)
    return
  }
  if (values.version) {
    console.log(ownVersion())
    return
  }

  const emoji = positionals[0]
  if (!emoji) fail('missing <emoji> argument, e.g. `npx emoji-icon-generator 🚀`')
  if (positionals.length > 1) fail(`expected one argument, got: ${positionals.join(' ')}`)

  const validation = validateEmoji(emoji)
  if (!validation.ok) fail(validation.error!)
  if (validation.warning) console.warn(`warning: ${validation.warning}`)

  const cwd = process.cwd()
  const project = detectProject(cwd)
  const outDir = path.resolve(cwd, values.out ?? project.outDir)

  const bg = values.bg ?? '#ffffff'
  const themeColor = values['theme-color'] ?? bg
  const name = values.name ?? project.projectName ?? 'App'
  let base = values.base ?? '/'
  if (!base.endsWith('/')) base += '/'

  const png512 = renderEmojiPng(emoji, 512, { scale: 0.8 })
  const files: Array<{ name: string; data: Buffer | string }> = [
    { name: 'favicon.svg', data: buildSvgFavicon(png512, 512) },
    {
      name: 'favicon.ico',
      data: packIco(
        [16, 32, 48].map((size) => ({ size, png: renderEmojiPng(emoji, size, { scale: 0.9 }) })),
      ),
    },
    {
      name: 'apple-touch-icon.png',
      data: renderEmojiPng(emoji, 180, { scale: 0.8, background: bg }),
    },
    { name: 'icon-192.png', data: renderEmojiPng(emoji, 192, { scale: 0.8 }) },
    { name: 'icon-512.png', data: png512 },
    {
      name: 'icon-maskable-192.png',
      data: renderEmojiPng(emoji, 192, { scale: 0.6, background: bg }),
    },
    {
      name: 'icon-maskable-512.png',
      data: renderEmojiPng(emoji, 512, { scale: 0.6, background: bg }),
    },
    { name: 'manifest.webmanifest', data: buildManifest({ name, base, themeColor, backgroundColor: bg }) },
  ]

  const headTags = buildHeadTags({ base, themeColor })
  files.push({ name: 'emoji-icons.html', data: headTags + '\n' })

  const relOut = path.relative(cwd, outDir) || '.'
  if (values['dry-run']) {
    console.log(`Would write to ${relOut}/ (${project.framework} detected):`)
    for (const file of files) console.log(`  ${file.name}`)
  } else {
    fs.mkdirSync(outDir, { recursive: true })
    for (const file of files) fs.writeFileSync(path.join(outDir, file.name), file.data)
    console.log(`Wrote ${files.length} files to ${relOut}/ (${project.framework} detected):`)
    for (const file of files) console.log(`  ${file.name}`)
  }

  console.log(`\nAdd this to ${project.pasteHint}:\n`)
  console.log(headTags)
  console.log(`\n(also saved as ${relOut}/emoji-icons.html)`)
}

main(process.argv.slice(2))
