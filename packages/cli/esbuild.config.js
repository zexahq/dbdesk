import * as esbuild from 'esbuild'
import { writeFileSync, readFileSync, cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)))
const isDev = process.argv.includes('--dev')

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'es2022',
  format: 'cjs',
  outfile: 'dist/index.js',
  // better-sqlite3 is a native addon and cannot be bundled; everything else
  // (pg, drizzle-orm, commander, js-yaml) is pure JS and gets bundled.
  // pg-native is an optional peer only used for explicit native bindings.
  external: ['better-sqlite3', 'pg-native'],
  sourcemap: isDev,
  minify: !isDev,
  treeShaking: true,
  legalComments: 'none'
})

// Prepend shebang after build (esbuild banner doesn't work well with ESM minification)
const content = readFileSync('dist/index.js', 'utf-8')
writeFileSync('dist/index.js', '#!/usr/bin/env node\n' + content, { mode: 0o755 })

// Ship runtime data next to dist/: drizzle migrations + agent skill.
// In the monorepo these live in sibling sources; in the published package
// they are static directories included via package.json "files".
const dbDrizzle = join(root, '..', 'db', 'drizzle')
if (existsSync(join(dbDrizzle, 'meta', '_journal.json'))) {
  mkdirSync(join(root, 'migrations'), { recursive: true })
  cpSync(dbDrizzle, join(root, 'migrations'), { recursive: true })
  console.log('Migrations copied to migrations/')
} else if (!existsSync(join(root, 'migrations', 'meta', '_journal.json'))) {
  console.warn('WARNING: drizzle migrations not found; CLI will fail migration checks.')
}

const skillSrc = join(root, 'src', 'skill')
if (existsSync(join(skillSrc, 'dbdesk', 'SKILL.md'))) {
  mkdirSync(join(root, 'skill'), { recursive: true })
  cpSync(skillSrc, join(root, 'skill'), { recursive: true })
  console.log('Skill copied to skill/')
}

// Stage a self-contained package for the Electron bundle: dist, migrations,
// skill, package.json, plus the native externals as real files (dereferenced,
// no symlinks — app packagers and Windows handle plain files best).
// The desktop app runs the CLI via ELECTRON_RUN_AS_NODE, so the binding must
// be the Electron-ABI build from this workspace (rebuilt by postinstall).
const bundled = join(root, 'bundled')
rmSync(bundled, { recursive: true, force: true })
mkdirSync(join(bundled, 'node_modules'), { recursive: true })
cpSync(join(root, 'dist'), join(bundled, 'dist'), { recursive: true })
cpSync(join(root, 'migrations'), join(bundled, 'migrations'), { recursive: true })
cpSync(join(root, 'skill'), join(bundled, 'skill'), { recursive: true })
cpSync(join(root, 'package.json'), join(bundled, 'package.json'))

const workspaceRequire = createRequire(join(root, 'package.json'))
const copyExternal = (name, subpaths) => {
  const src = dirname(workspaceRequire.resolve(`${name}/package.json`))
  for (const sub of subpaths) {
    cpSync(join(src, sub), join(bundled, 'node_modules', name, sub), {
      recursive: true,
      dereference: true
    })
  }
}
// Compiled binding (Electron ABI) + JS wrapper deps.
copyExternal('better-sqlite3', ['package.json', 'lib', 'build/Release/better_sqlite3.node'])
copyExternal('bindings', ['package.json', 'bindings.js'])
copyExternal('file-uri-to-path', ['package.json', 'index.js'])
console.log('Desktop bundle staged to bundled/')

console.log('CLI bundled to dist/index.js')
