import { connectionManager } from '../connectionManager'
import { isReadOnlyQuery } from '../lib/sql-parser'
import { isProfileReadOnly } from '../lib/read-only'
import { getProfile } from '../storage'
import { ConnectionError, QueryError, ValidationError } from '../utils/errors'
import { typedHandle } from './typed-handle'

// PostgreSQL error code for "query was cancelled at user request".
const PG_QUERY_CANCELED = '57014'

export function registerQueryHandlers() {
  typedHandle('query:run', async ({ connectionId, query, limit, offset, queryId }) => {
    const adapter = connectionManager.getConnection(connectionId)
    if (!adapter) throw new ConnectionError(`Connection "${connectionId}" is not established`)

    const profile = await getProfile(connectionId)
    if (isProfileReadOnly(profile) && !isReadOnlyQuery(query)) {
      throw new ValidationError(
        `Connection "${profile?.name ?? connectionId}" is read-only. Only single SELECT or SHOW statements are allowed.`
      )
    }

    try {
      return await adapter.runQuery(query, { limit, offset, queryId })
    } catch (error) {
      // Surface user-initiated cancels as a clear, non-scary message.
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code?: string }).code === PG_QUERY_CANCELED
      ) {
        throw new QueryError('Query cancelled.', error)
      }
      const message = error instanceof Error ? error.message : 'Failed to execute query'
      throw new QueryError(message, error)
    }
  })

  typedHandle('query:runMany', async ({ connectionId, queries, limit, offset }) => {
    const adapter = connectionManager.getConnection(connectionId)
    if (!adapter) throw new ConnectionError(`Connection "${connectionId}" is not established`)

    const profile = await getProfile(connectionId)
    const unsafeQuery = queries.find((query) => !isReadOnlyQuery(query))
    if (isProfileReadOnly(profile) && unsafeQuery) {
      throw new ValidationError(
        `Connection "${profile?.name ?? connectionId}" is read-only. Only single SELECT or SHOW statements are allowed.`
      )
    }

    try {
      return await adapter.runManyQueries(queries, { limit, offset })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to execute queries'
      throw new QueryError(message, error)
    }
  })

  typedHandle('query:cancel', async ({ connectionId, queryId }) => {
    const adapter = connectionManager.getConnection(connectionId)
    if (!adapter) throw new ConnectionError(`Connection "${connectionId}" is not established`)
    if (typeof adapter.cancelQuery !== 'function') return { cancelled: false }
    const cancelled = await adapter.cancelQuery(queryId)
    return { cancelled }
  })
}
