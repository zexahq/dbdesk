import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { get } from 'node:https'
import { cliVersion, stateDir } from './paths'

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000
const REQUEST_TIMEOUT_MS = 1500

function cacheFile(): string {
  return join(stateDir(), 'update-check.json')
}

function readCache(): { lastCheck: number; latest: string } | null {
  try {
    const raw = readFileSync(cacheFile(), 'utf-8')
    const parsed = JSON.parse(raw) as { lastCheck?: unknown; latest?: unknown }
    if (typeof parsed.lastCheck === 'number' && typeof parsed.latest === 'string') {
      return { lastCheck: parsed.lastCheck, latest: parsed.latest }
    }
  } catch {
    // no cache yet
  }
  return null
}

function writeCache(latest: string): void {
  try {
    mkdirSync(stateDir(), { recursive: true })
    writeFileSync(cacheFile(), JSON.stringify({ lastCheck: Date.now(), latest }), { mode: 0o600 })
  } catch {
    // best effort only
  }
}

function fetchLatest(): Promise<string | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), REQUEST_TIMEOUT_MS)
    const req = get('https://registry.npmjs.org/dbdesk/latest', { timeout: REQUEST_TIMEOUT_MS }, (res) => {
      let body = ''
      res.on('data', (chunk: unknown) => {
        body += String(chunk)
      })
      res.on('end', () => {
        clearTimeout(timer)
        try {
          const parsed = JSON.parse(body) as { version?: unknown }
          resolve(typeof parsed.version === 'string' ? parsed.version : null)
        } catch {
          resolve(null)
        }
      })
    })
    req.on('error', () => {
      clearTimeout(timer)
      resolve(null)
    })
    req.on('timeout', () => {
      req.destroy()
      clearTimeout(timer)
      resolve(null)
    })
  })
}

function isNewer(latest: string, current: string): boolean {
  const parse = (v: string) => v.split('-')[0].split('.').map((n) => parseInt(n, 10) || 0)
  const a = parse(latest)
  const b = parse(current)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0
    const y = b[i] ?? 0
    if (x !== y) return x > y
  }
  return false
}

/**
 * Notify (stderr) when a newer dbdesk release exists. At most once per day,
 * fast path is a single file read. Never throws. Respects NO_UPDATE_CHECK /
 * DBDESK_NO_UPDATE_CHECK / CI. Safe to call for JSON output (stderr only).
 */
export async function maybeNotifyUpdate(quiet: boolean): Promise<void> {
  if (quiet) return
  if (process.env.NO_UPDATE_CHECK || process.env.DBDESK_NO_UPDATE_CHECK || process.env.CI) return

  const current = cliVersion()
  if (current.includes('dev')) return

  const cached = readCache()
  if (cached && Date.now() - cached.lastCheck < CHECK_INTERVAL_MS) {
    if (isNewer(cached.latest, current)) {
      notify(cached.latest, current)
    }
    return
  }

  const latest = await fetchLatest()
  if (!latest) return
  writeCache(latest)
  if (isNewer(latest, current)) {
    notify(latest, current)
  }
}

function notify(latest: string, current: string): void {
  if (!process.env.NO_COLOR) {
    console.error(`\x1b[33mUpdate available: dbdesk ${current} → ${latest}  (npm i -g dbdesk)\x1b[0m`)
  } else {
    console.error(`Update available: dbdesk ${current} → ${latest}  (npm i -g dbdesk)`)
  }
}

export function updateCachePath(): string {
  return cacheFile()
}
