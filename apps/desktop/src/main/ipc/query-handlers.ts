import { connectionManager } from '../connectionManager'
import { ConnectionError, QueryError } from '../utils/errors'
import { typedHandle } from './typed-handle'

export function registerQueryHandlers() {
  typedHandle('query:run', async ({ connectionId, queries, limit, offset }) => {
    const adapter = connectionManager.getConnection(connectionId)
    if (!adapter) throw new ConnectionError(`Connection "${connectionId}" is not established`)

    try {
      return await adapter.runQuery(queries, { limit, offset })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to execute batch query'
      throw new QueryError(message, error)
    }
  })
}
