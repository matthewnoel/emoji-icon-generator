# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm test                          # tsup build, then full vitest suite
npm run build                     # tsup: src/cli.ts -> dist/cli.js (ESM)
npm run typecheck                 # tsc --noEmit
npx vitest run test/units.test.ts # single test file
npx vitest run -t "packIco"       # tests matching a name
```

Gotcha: `test/cli.test.ts` spawns `dist/cli.js`, so running vitest directly
after editing `src/` tests stale code — run `npm test` (which builds first)
or `npm run build` before `npx vitest`.

## What this is

A CLI-only npm package (`npx emoji-icon-generator 🚀`) that renders one emoji
into a full web-icon set: `favicon.svg`/`.ico`, `apple-touch-icon.png`,
standard + maskable PWA PNGs, `manifest.webmanifest`, and an
`emoji-icons.html` head-tag snippet. There is deliberately no programmatic
API export — `src/cli.ts` is the only entry point and orchestrates the
single-purpose modules (`detect`, `emoji`, `render`, `ico`, `svg`,
`manifest`, `headTags`).

## Design decisions to preserve

- **Native emoji rendering.** The emoji is drawn with the *generating
  machine's* system emoji font via `@napi-rs/canvas` (`src/render.ts`).
  Output intentionally varies by platform and renders as tofu in CI —
  that is accepted, not a bug. Tests therefore assert file structure and
  PNG/ICO header dimensions, never pixels. Even `favicon.svg` is
  non-vector: it wraps a 512px PNG render as a data URI so viewers see the
  dev's emoji, not their own platform's.
- **Minimal dependencies.** `@napi-rs/canvas` is the only runtime
  dependency, per the owner's explicit preference. That's why the ICO
  container is hand-rolled (`src/ico.ts`, PNG-in-ICO) and arg parsing uses
  `node:util` `parseArgs`. Don't add dependencies for things a few dozen
  lines can do.
- **Framework detection drives defaults only.** `src/detect.ts` reads the
  consumer's package.json to pick the output dir (SvelteKit → `static/`,
  Vite/Next/Astro/CRA → `public/`) and the head-tag paste hint; every
  default is overridable by a flag. Order matters: SvelteKit must be
  checked before Vite since SvelteKit projects also depend on vite.
- **Emoji input is one grapheme** (`src/emoji.ts`, `Intl.Segmenter`), so
  ZWJ sequences/skin tones pass; non-emoji graphemes warn but proceed.

## Releases are fully automatic

Every merge to `main` publishes to npm (`.github/workflows/release.yml`,
npm Trusted Publishing/OIDC — no token). The next version is computed
against the **npm registry** (`npm view`), not git tags: normally a patch
bump of the latest published version; if `package.json` already carries a
newer version (set deliberately in a PR), that wins. So:

- Never bump the version for a patch release — the workflow does it and
  syncs `package.json` back to `main` with a `[skip ci]` commit.
- For a minor/major release, set the version in `package.json` in the PR.
- Versions must be plain `x.y.z`; prereleases aren't handled.
- Release tags are pushed as explicit refs (`--follow-tags` silently drops
  lightweight tags — that bug already happened once; `v0.1.1` has no tag).

CI (`ci.yml`) tests on Node 18/20/22; `.nvmrc` pins 22 and the release
workflow reads it via `node-version-file`. `engines` requires Node ≥ 18.
