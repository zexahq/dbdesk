import { connectionManager } from '../connectionManager'
import { ConnectionError, QueryError } from '../utils/errors'
import { typedHandle } from './typed-handle'

export function registerQueryHandlers() {
  typedHandle('query:run', async ({ connectionId, query, limit, offset }) => {
    const adapter = connectionManager.getConnection(connectionId)
    if (!adapter) throw new ConnectionError(`Connection "${connectionId}" is not established`)

    try {
      return await adapter.runQuery(query, { limit, offset })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to execute query'
      throw new QueryError(message, error)
    }
  })

  typedHandle('query:runMany', async ({ connectionId, queries, limit, offset }) => {
    const adapter = connectionManager.getConnection(connectionId)
    if (!adapter) throw new ConnectionError(`Connection "${connectionId}" is not established`)

    try {
      return await adapter.runManyQueries(queries, { limit, offset })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to execute queries'
      throw new QueryError(message, error)
    }
  })
}
