import { PostgresAdapter } from '@dbdesk/shared/adapters'
import type { SQLConnectionOptions, ConnectionProfile } from '@dbdesk/shared/types'

interface AdapterEntry {
  adapter: PostgresAdapter
  lastUsed: number
}

const pool = new Map<string, AdapterEntry>()
const IDLE_TIMEOUT_MS = 10 * 60 * 1000

let cleanupTimer: ReturnType<typeof setInterval> | null = null

function getOptions(profile: ConnectionProfile): SQLConnectionOptions {
  const opts = profile.options as unknown as Record<string, unknown>
  return {
    host: String(opts.host ?? 'localhost'),
    port: Number(opts.port ?? 5432),
    database: String(opts.database ?? ''),
    user: String(opts.user ?? ''),
    password: String(opts.password ?? ''),
    sslMode: opts.sslMode as SQLConnectionOptions['sslMode']
  }
}

export async function getAdapter(profile: ConnectionProfile): Promise<PostgresAdapter> {
  const entry = pool.get(profile.id)
  if (entry) {
    entry.lastUsed = Date.now()
    return entry.adapter
  }

  const options = getOptions(profile)
  const adapter = new PostgresAdapter(options)
  await adapter.connect()

  pool.set(profile.id, { adapter, lastUsed: Date.now() })

  if (!cleanupTimer) {
    cleanupTimer = setInterval(cleanup, 60_000)
  }

  return adapter
}

function cleanup(): void {
  const now = Date.now()
  for (const [id, entry] of pool) {
    if (now - entry.lastUsed > IDLE_TIMEOUT_MS) {
      entry.adapter.disconnect().catch(() => {})
      pool.delete(id)
    }
  }
  if (pool.size === 0 && cleanupTimer) {
    clearInterval(cleanupTimer)
    cleanupTimer = null
  }
}

export async function disconnectAll(): Promise<void> {
  if (cleanupTimer) {
    clearInterval(cleanupTimer)
    cleanupTimer = null
  }
  const promises = Array.from(pool.values()).map((e) => e.adapter.disconnect().catch(() => {}))
  await Promise.all(promises)
  pool.clear()
}
