import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { detectProject } from '../src/detect.js'
import { validateEmoji } from '../src/emoji.js'
import { buildHeadTags } from '../src/headTags.js'
import { packIco } from '../src/ico.js'
import { buildManifest } from '../src/manifest.js'
import { buildSvgFavicon } from '../src/svg.js'

describe('validateEmoji', () => {
  it('accepts a simple emoji', () => {
    expect(validateEmoji('🚀')).toEqual({ ok: true })
  })

  it('accepts ZWJ sequences and skin tones as one grapheme', () => {
    expect(validateEmoji('👩‍👩‍👧‍👦').ok).toBe(true)
    expect(validateEmoji('👍🏽').ok).toBe(true)
    expect(validateEmoji('1️⃣').ok).toBe(true)
  })

  it('rejects multiple graphemes', () => {
    const result = validateEmoji('🚀🌟')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/single emoji/)
  })

  it('rejects empty input', () => {
    expect(validateEmoji('').ok).toBe(false)
  })

  it('warns on non-emoji but allows it', () => {
    const result = validateEmoji('A')
    expect(result.ok).toBe(true)
    expect(result.warning).toMatch(/doesn't look like an emoji/)
  })
})

describe('packIco', () => {
  it('lays out header, directory, and payloads correctly', () => {
    const png16 = Buffer.from('fake-png-16')
    const png256 = Buffer.from('fake-png-256-payload')
    const ico = packIco([
      { size: 16, png: png16 },
      { size: 256, png: png256 },
    ])

    expect(ico.readUInt16LE(0)).toBe(0) // reserved
    expect(ico.readUInt16LE(2)).toBe(1) // icon type
    expect(ico.readUInt16LE(4)).toBe(2) // count

    // Entry 0: 16px
    expect(ico.readUInt8(6)).toBe(16)
    expect(ico.readUInt8(7)).toBe(16)
    expect(ico.readUInt16LE(12)).toBe(32) // bpp
    expect(ico.readUInt32LE(14)).toBe(png16.length)
    const offset0 = ico.readUInt32LE(18)
    expect(offset0).toBe(6 + 2 * 16)

    // Entry 1: 256px is encoded as width/height byte 0
    expect(ico.readUInt8(22)).toBe(0)
    expect(ico.readUInt8(23)).toBe(0)
    expect(ico.readUInt32LE(30)).toBe(png256.length)
    const offset1 = ico.readUInt32LE(34)
    expect(offset1).toBe(offset0 + png16.length)

    expect(ico.subarray(offset0, offset0 + png16.length)).toEqual(png16)
    expect(ico.subarray(offset1)).toEqual(png256)
  })

  it('rejects an empty entry list', () => {
    expect(() => packIco([])).toThrow()
  })
})

describe('buildSvgFavicon', () => {
  it('embeds the png as a base64 data uri at the given size', () => {
    const png = Buffer.from('png-bytes')
    const svg = buildSvgFavicon(png, 512)
    expect(svg).toContain('width="512"')
    expect(svg).toContain(`href="data:image/png;base64,${png.toString('base64')}"`)
  })
})

describe('buildManifest', () => {
  it('produces a valid manifest with all four icons', () => {
    const manifest = JSON.parse(
      buildManifest({ name: 'My App', base: '/', themeColor: '#123456', backgroundColor: '#ffffff' }),
    )
    expect(manifest.name).toBe('My App')
    expect(manifest.short_name).toBe('My App')
    expect(manifest.theme_color).toBe('#123456')
    expect(manifest.icons).toHaveLength(4)
    expect(manifest.icons.map((i: { src: string }) => i.src)).toEqual([
      '/icon-192.png',
      '/icon-512.png',
      '/icon-maskable-192.png',
      '/icon-maskable-512.png',
    ])
    const maskable = manifest.icons.filter((i: { purpose?: string }) => i.purpose === 'maskable')
    expect(maskable).toHaveLength(2)
  })

  it('respects a base path', () => {
    const manifest = JSON.parse(
      buildManifest({ name: 'x', base: '/app/', themeColor: '#fff', backgroundColor: '#fff' }),
    )
    expect(manifest.icons[0].src).toBe('/app/icon-192.png')
  })
})

describe('buildHeadTags', () => {
  it('links every asset with the base path', () => {
    const tags = buildHeadTags({ base: '/app/', themeColor: '#123456' })
    expect(tags).toContain('href="/app/favicon.svg" type="image/svg+xml"')
    expect(tags).toContain('href="/app/favicon.ico" sizes="48x48"')
    expect(tags).toContain('rel="apple-touch-icon" href="/app/apple-touch-icon.png"')
    expect(tags).toContain('rel="manifest" href="/app/manifest.webmanifest"')
    expect(tags).toContain('name="theme-color" content="#123456"')
  })
})

describe('detectProject', () => {
  const tmpDirs: string[] = []
  afterEach(() => {
    for (const dir of tmpDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true })
  })

  function projectWith(pkg: object): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eig-detect-'))
    tmpDirs.push(dir)
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg))
    return dir
  }

  it('detects SvelteKit -> static/', () => {
    const dir = projectWith({ name: 'my-site', devDependencies: { '@sveltejs/kit': '^2.0.0' } })
    const info = detectProject(dir)
    expect(info.framework).toBe('SvelteKit')
    expect(info.outDir).toBe('static')
    expect(info.pasteHint).toContain('src/app.html')
    expect(info.projectName).toBe('my-site')
  })

  it('detects Vite -> public/', () => {
    const info = detectProject(projectWith({ devDependencies: { vite: '^5.0.0' } }))
    expect(info.framework).toBe('Vite')
    expect(info.outDir).toBe('public')
  })

  it('detects Next.js -> public/', () => {
    const info = detectProject(projectWith({ dependencies: { next: '^15.0.0' } }))
    expect(info.framework).toBe('Next.js')
    expect(info.outDir).toBe('public')
  })

  it('prefers SvelteKit over Vite when both are present', () => {
    const info = detectProject(
      projectWith({ devDependencies: { '@sveltejs/kit': '^2.0.0', vite: '^5.0.0' } }),
    )
    expect(info.framework).toBe('SvelteKit')
  })

  it('falls back to cwd when no package.json exists', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eig-detect-'))
    tmpDirs.push(dir)
    const info = detectProject(dir)
    expect(info.framework).toBe('unknown')
    expect(info.outDir).toBe('.')
  })
})
