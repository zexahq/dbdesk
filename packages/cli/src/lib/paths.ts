import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'

let cachedRoot: string | null = null

function readPkgName(dir: string): string | null {
  try {
    const raw = readFileSync(join(dir, 'package.json'), 'utf-8')
    const parsed = JSON.parse(raw) as { name?: unknown }
    return typeof parsed.name === 'string' ? parsed.name : null
  } catch {
    return null
  }
}

/**
 * Directory that contains the CLI's package.json.
 * - Installed/bundled: <root>/dist/index.js  ->  <root>/package.json
 * - Dev (tsx src):     <root>/src            ->  <root>/package.json
 */
export function packageRoot(): string {
  if (cachedRoot) return cachedRoot

  let dir = __dirname
  for (let i = 0; i < 5; i++) {
    const name = readPkgName(dir)
    if (name === 'dbdesk' || name === '@dbdesk/cli') {
      cachedRoot = dir
      return dir
    }
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }

  // Fallback: dist/.. (bundled) — even if package.json lookup failed
  cachedRoot = join(__dirname, '..')
  return cachedRoot
}

export function cliVersion(): string {
  try {
    const raw = readFileSync(join(packageRoot(), 'package.json'), 'utf-8')
    const parsed = JSON.parse(raw) as { version?: unknown }
    if (typeof parsed.version === 'string' && parsed.version.length > 0) {
      return parsed.version
    }
  } catch {
    // fall through
  }
  return '0.0.0-dev'
}

function firstExisting(candidates: string[]): string | null {
  for (const c of candidates) {
    if (existsSync(c)) return c
  }
  return null
}

/**
 * Directory with drizzle migration files (*.sql + meta/_journal.json).
 * Published package ships a top-level `migrations/` copy; in dev we fall
 * back to the @dbdesk/db drizzle source folder.
 */
export function migrationsDir(): string {
  const root = packageRoot()
  const found = firstExisting([
    join(root, 'migrations'),
    join(root, '..', 'db', 'drizzle'),
    join(root, 'src', '..', '..', 'db', 'drizzle')
  ])
  if (!found) {
    throw new Error(
      'Migration files not found. Reinstall dbdesk (`npm i -g dbdesk`) or run from the DBDesk monorepo.'
    )
  }
  return found
}

/**
 * Directory containing the agent skill (`dbdesk/SKILL.md`).
 */
export function skillDir(): string {
  const root = packageRoot()
  const found = firstExisting([join(root, 'skill'), join(root, 'src', 'skill')])
  if (!found) {
    throw new Error('Skill files not found. Reinstall dbdesk (`npm i -g dbdesk`).')
  }
  return found
}

export function stateDir(): string {
  const home = homedir()
  switch (process.platform) {
    case 'darwin':
      return join(home, 'Library', 'Application Support', 'dbdesk')
    case 'win32':
      return join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), 'dbdesk')
    default: {
      const xdg = process.env.XDG_STATE_HOME || join(home, '.local', 'state')
      return join(xdg, 'dbdesk')
    }
  }
}
