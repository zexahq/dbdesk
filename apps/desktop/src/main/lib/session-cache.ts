import { getSqlite } from '@dbdesk/db'

const CACHE_KEY = 'current'

interface CachedSession {
  id: string
  userId: string
  userName: string
  userEmail: string
  userImage: string | null
  sessionToken: string
  sessionExpiresAt: number
  cachedAt: number
}

interface CachedSessionRow {
  id: string
  user_id: string
  user_name: string
  user_email: string
  user_image: string | null
  session_token: string
  session_expires_at: number
  cached_at: number
}

/**
 * Read the cached session from local SQLite.
 * Returns null if no cache exists or the server-side expiry has passed.
 */
export function getCachedSession(): CachedSession | null {
  try {
    const row = getSqlite()
      .prepare('SELECT * FROM auth_session_cache WHERE id = ?')
      .get(CACHE_KEY) as CachedSessionRow | undefined

    if (!row) return null

    // If the server-side expiry has passed, treat cache as stale
    if (row.session_expires_at < Date.now()) {
      clearCachedSession()
      return null
    }

    return {
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      userImage: row.user_image,
      sessionToken: row.session_token,
      sessionExpiresAt: row.session_expires_at,
      cachedAt: row.cached_at
    }
  } catch {
    return null
  }
}

/**
 * Persist a session to the local SQLite cache.
 */
export function setCachedSession(session: Omit<CachedSession, 'cachedAt'>): void {
  try {
    getSqlite()
      .prepare(
        `INSERT OR REPLACE INTO auth_session_cache (id, user_id, user_name, user_email, user_image, session_token, session_expires_at, cached_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        CACHE_KEY,
        session.userId,
        session.userName,
        session.userEmail,
        session.userImage ?? null,
        session.sessionToken,
        session.sessionExpiresAt,
        Date.now()
      )
  } catch (err) {
    console.error('[session-cache] setCachedSession error:', err)
  }
}

/**
 * Delete the cached session from local SQLite.
 */
export function clearCachedSession(): void {
  try {
    getSqlite().prepare('DELETE FROM auth_session_cache WHERE id = ?').run(CACHE_KEY)
  } catch (err) {
    console.error('[session-cache] clearCachedSession error:', err)
  }
}
