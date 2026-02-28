import type { DbdeskAPI } from '../../../../preload/dbdesk-api'

function getDbdesk(): DbdeskAPI {
  if (typeof window === 'undefined' || !window.dbdesk) {
    throw new Error(
      'DBDesk preload API is not available. Ensure preload is loaded and contextIsolation is enabled.',
    )
  }
  return window.dbdesk
}

/**
 * Thin proxy around `window.dbdesk` that:
 *  1. Provides a safe getter (throws if preload is missing).
 *  2. Gives the renderer a single, importable client object.
 *
 * All method signatures and return types are inferred from DbdeskAPI.
 */
export const dbdeskClient: DbdeskAPI = new Proxy({} as DbdeskAPI, {
  get(_target, prop: string) {
    const api = getDbdesk()
    const value = api[prop as keyof DbdeskAPI]
    if (typeof value === 'function') {
      return value.bind(api)
    }
    return value
  },
})
