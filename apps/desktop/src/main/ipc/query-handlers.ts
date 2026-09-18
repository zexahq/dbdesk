import { connectionManager } from '../connectionManager'
import { shouldRunReadOnly } from '../lib/query-safety'
import { getProfile } from '../storage'
import { ConnectionError, QueryError } from '../utils/errors'
import { typedHandle } from './typed-handle'

// PostgreSQL error code for "query was cancelled at user request".
const PG_QUERY_CANCELED = '57014'

export function registerQueryHandlers() {
  typedHandle('query:run', async ({ connectionId, query, limit, offset, queryId, readOnly }) => {
    const adapter = connectionManager.getConnection(connectionId)
    if (!adapter) throw new ConnectionError(`Connection "${connectionId}" is not established`)

    try {
      const profile = await getProfile(connectionId)
      return await adapter.runQuery(query, {
        limit,
        offset,
        queryId,
        readOnly: shouldRunReadOnly(profile, readOnly)
      })
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

  typedHandle('query:runMany', async ({ connectionId, queries, limit, offset, readOnly }) => {
    const adapter = connectionManager.getConnection(connectionId)
    if (!adapter) throw new ConnectionError(`Connection "${connectionId}" is not established`)

    try {
      const profile = await getProfile(connectionId)
      return await adapter.runManyQueries(queries, {
        limit,
        offset,
        readOnly: shouldRunReadOnly(profile, readOnly)
      })
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
