import type { SQLAdapter } from '@dbdesk/shared/types'
import { connectionManager } from '../connectionManager'
import { ConnectionError, ValidationError } from '../utils/errors'
import { typedHandle } from './typed-handle'

const ensureSQLAdapter = (connectionId: string): SQLAdapter => {
  const adapter = connectionManager.getSQLConnection(connectionId)
  if (!adapter) throw new ConnectionError(`Connection "${connectionId}" is not available`)
  if (typeof adapter.listSchemas !== 'function')
    throw new ValidationError('Requested operation requires a SQL adapter')
  return adapter
}

export function registerSchemaHandlers() {
  typedHandle('schema:list', async ({ connectionId }) => {
    return ensureSQLAdapter(connectionId).listSchemas()
  })

  typedHandle('schema:tables', async ({ connectionId, schema }) => {
    return ensureSQLAdapter(connectionId).listTables(schema)
  })

  typedHandle('schema:listWithTables', async ({ connectionId }) => {
    return ensureSQLAdapter(connectionId).listSchemaWithTables()
  })

  typedHandle('schema:introspect', async ({ connectionId, schema, table }) => {
    return ensureSQLAdapter(connectionId).introspectTable(schema, table)
  })
}
