import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'

const CLI = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'cli.js')

const tmpDirs: string[] = []
afterEach(() => {
  for (const dir of tmpDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true })
})

function makeProject(pkg?: object): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eig-cli-'))
  tmpDirs.push(dir)
  if (pkg) fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg))
  return dir
}

function run(cwd: string, args: string[]): string {
  return execFileSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8' })
}

function pngSize(file: string): { width: number; height: number } {
  const buf = fs.readFileSync(file)
  expect(buf.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

const EXPECTED_FILES = [
  'favicon.svg',
  'favicon.ico',
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-192.png',
  'icon-maskable-512.png',
  'manifest.webmanifest',
  'emoji-icons.html',
]

describe('cli end-to-end', () => {
  it('writes all assets into static/ for a SvelteKit project', () => {
    const dir = makeProject({ name: 'my-site', devDependencies: { '@sveltejs/kit': '^2.0.0' } })
    const out = run(dir, ['🚀'])

    const staticDir = path.join(dir, 'static')
    for (const file of EXPECTED_FILES) {
      expect(fs.existsSync(path.join(staticDir, file)), file).toBe(true)
    }

    expect(pngSize(path.join(staticDir, 'apple-touch-icon.png'))).toEqual({ width: 180, height: 180 })
    expect(pngSize(path.join(staticDir, 'icon-192.png'))).toEqual({ width: 192, height: 192 })
    expect(pngSize(path.join(staticDir, 'icon-512.png'))).toEqual({ width: 512, height: 512 })

    // favicon.ico: valid header with three PNG entries at 16/32/48
    const ico = fs.readFileSync(path.join(staticDir, 'favicon.ico'))
    expect(ico.readUInt16LE(2)).toBe(1)
    expect(ico.readUInt16LE(4)).toBe(3)
    expect([ico.readUInt8(6), ico.readUInt8(22), ico.readUInt8(38)]).toEqual([16, 32, 48])
    const firstOffset = ico.readUInt32LE(18)
    expect(ico.readUInt32BE(firstOffset)).toBe(0x89504e47) // PNG magic

    const manifest = JSON.parse(fs.readFileSync(path.join(staticDir, 'manifest.webmanifest'), 'utf8'))
    expect(manifest.name).toBe('my-site')

    expect(out).toContain('static/')
    expect(out).toContain('SvelteKit')
    expect(out).toContain('src/app.html')
    expect(out).toContain('<link rel="icon" href="/favicon.svg"')

    const snippet = fs.readFileSync(path.join(staticDir, 'emoji-icons.html'), 'utf8')
    expect(snippet).toContain('rel="manifest"')
  })

  it('writes into public/ for a Vite project and mentions index.html', () => {
    const dir = makeProject({ devDependencies: { vite: '^5.0.0' } })
    const out = run(dir, ['🎉'])
    expect(fs.existsSync(path.join(dir, 'public', 'favicon.ico'))).toBe(true)
    expect(out).toContain('index.html')
  })

  it('honors --out, --base, --name, and --theme-color', () => {
    const dir = makeProject()
    const out = run(dir, ['🔥', '-o', 'assets/icons', '--base', '/app', '--name', 'Hot App', '--theme-color', '#ff0000'])
    const outDir = path.join(dir, 'assets', 'icons')
    expect(fs.existsSync(path.join(outDir, 'favicon.svg'))).toBe(true)
    const manifest = JSON.parse(fs.readFileSync(path.join(outDir, 'manifest.webmanifest'), 'utf8'))
    expect(manifest.name).toBe('Hot App')
    expect(manifest.theme_color).toBe('#ff0000')
    expect(manifest.icons[0].src).toBe('/app/icon-192.png')
    expect(out).toContain('content="#ff0000"')
  })

  it('--dry-run writes nothing', () => {
    const dir = makeProject({ devDependencies: { vite: '^5.0.0' } })
    const out = run(dir, ['🚀', '--dry-run'])
    expect(out).toContain('Would write')
    expect(fs.existsSync(path.join(dir, 'public'))).toBe(false)
  })

  it('fails without an emoji argument', () => {
    const dir = makeProject()
    expect(() => run(dir, [])).toThrow()
  })

  it('fails on multi-grapheme input', () => {
    const dir = makeProject()
    expect(() => run(dir, ['🚀🌟'])).toThrow()
  })

  it('prints help and version', () => {
    const dir = makeProject()
    expect(run(dir, ['--help'])).toContain('Usage:')
    expect(run(dir, ['--version']).trim()).toMatch(/^\d+\.\d+\.\d+$/)
  })
})
