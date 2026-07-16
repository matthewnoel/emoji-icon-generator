import fs from 'node:fs'
import path from 'node:path'

export interface ProjectInfo {
  framework: string
  /** Default output directory, relative to the project root. */
  outDir: string
  /** Where the user should paste the head tags. */
  pasteHint: string
  /** Project name from package.json, if any. */
  projectName?: string
}

const FALLBACK: ProjectInfo = {
  framework: 'unknown',
  outDir: '.',
  pasteHint: "your site's HTML <head>",
}

/**
 * Detect the framework from the nearest package.json so we can default the
 * output directory to where the framework serves static files from.
 */
export function detectProject(cwd: string): ProjectInfo {
  const pkgPath = path.join(cwd, 'package.json')
  let pkg: Record<string, unknown>
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  } catch {
    return FALLBACK
  }

  const deps: Record<string, string> = {
    ...(pkg.dependencies as Record<string, string> | undefined),
    ...(pkg.devDependencies as Record<string, string> | undefined),
  }
  const projectName = typeof pkg.name === 'string' ? pkg.name : undefined

  let info: Omit<ProjectInfo, 'projectName'>
  if (deps['@sveltejs/kit']) {
    info = {
      framework: 'SvelteKit',
      outDir: 'static',
      pasteHint: 'the <head> of src/app.html',
    }
  } else if (deps['next']) {
    info = {
      framework: 'Next.js',
      outDir: 'public',
      pasteHint: 'the <head> of your root layout (app/layout.tsx) or pages/_document',
    }
  } else if (deps['astro']) {
    info = {
      framework: 'Astro',
      outDir: 'public',
      pasteHint: 'the <head> of your base layout (src/layouts/*.astro)',
    }
  } else if (deps['react-scripts']) {
    info = {
      framework: 'Create React App',
      outDir: 'public',
      pasteHint: 'the <head> of public/index.html',
    }
  } else if (deps['vite']) {
    info = {
      framework: 'Vite',
      outDir: 'public',
      pasteHint: 'the <head> of index.html',
    }
  } else {
    info = FALLBACK
  }

  return { ...info, projectName }
}
