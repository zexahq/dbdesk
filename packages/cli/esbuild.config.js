import * as esbuild from 'esbuild'
import { writeFileSync, readFileSync, cpSync, existsSync, mkdirSync } from 'node:fs'
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
  external: [
    'better-sqlite3',
    'pg',
    'pg-native',
    'pg-query-stream'
  ],
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

console.log('CLI bundled to dist/index.js')
