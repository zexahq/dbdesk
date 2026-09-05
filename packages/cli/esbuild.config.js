import * as esbuild from 'esbuild'
import { writeFileSync, readFileSync } from 'node:fs'

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

console.log('CLI bundled to dist/index.js')
