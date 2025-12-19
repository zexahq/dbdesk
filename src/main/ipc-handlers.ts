import type {
  ConnectionProfile,
  ConnectionWorkspace,
  DatabaseType,
  DeleteTableRowsResult,
  QueryResult,
  SavedQuery,
  SchemaWithTables,
  SQLAdapter,
  TableDataOptions,
  TableDataResult,
  TableInfo,
  UpdateTableCellResult
} from '@common/types'
import { ipcMain } from 'electron'
import { randomUUID } from 'node:crypto'
import { adapterRegistry, listRegisteredAdapters } from './adapters'
import { connectionManager } from './connectionManager'
import { deleteProfile, getProfile, loadProfiles, saveProfile } from './storage'
import { ConnectionError, QueryError, sanitizeError, ValidationError } from './utils/errors'
import {
  validateConnectionIdentifier,
  validateCreateConnectionInput,
  validateDeleteRowsInput,
  validateQueryInput,
  validateSchemaInput,
  validateTableDataInput,
  validateUpdateCellInput,
  validateUpdateConnectionInput,
  validateWorkspaceInput
} from './utils/validation'
import { deleteWorkspace, loadWorkspace, saveWorkspace } from './workspace-storage'
import {
  deleteQuery,
  deleteAllQueriesForConnection,
  loadQueries,
  saveQuery,
  updateQuery
} from './saved-queries-storage'

type SafeIpcHandler<Payload, Result> = (payload: Payload) => Promise<Result> | Result

const safeHandle = <Payload = unknown, Result = unknown>(
  channel: string,
  handler: SafeIpcHandler<Payload, Result>
): void => {
  ipcMain.handle(channel, async (_event, payload: Payload) => {
    try {
      return await handler(payload)
    } catch (error) {
      console.error(`[IPC:${channel}]`, error)
      const sanitized = sanitizeError(error)
      const err = new Error(sanitized.message)
      err.name = sanitized.name
      throw err
    }
  })
}

const createProfile = (
  name: string,
  type: DatabaseType,
  options: ConnectionProfile['options']
): ConnectionProfile => {
  const now = new Date()
  return {
    id: randomUUID(),
    name,
    type,
    options,
    createdAt: now,
    updatedAt: now
  } as ConnectionProfile
}

const ensureSQLAdapter = (adapter: unknown, connectionId: string): SQLAdapter => {
  if (!adapter || typeof adapter !== 'object') {
    throw new ConnectionError(`Connection "${connectionId}" is not available`)
  }

  if (!('listSchemas' in adapter) || typeof (adapter as SQLAdapter).listSchemas !== 'function') {
    throw new ValidationError('Requested operation requires a SQL adapter')
  }

  return adapter as SQLAdapter
}

export const registerIpcHandlers = (): void => {
  safeHandle('adapters:list', async () => listRegisteredAdapters())

  safeHandle('connections:list', async () => loadProfiles())

  safeHandle('connections:get', async (payload) => {
    const { connectionId } = validateConnectionIdentifier(payload)
    return getProfile(connectionId)
  })

  safeHandle('connections:create', async (payload) => {
    const { name, type, options } = validateCreateConnectionInput(payload)

    if (!adapterRegistry.getFactory(type)) {
      throw new ValidationError(`Adapter "${type}" is not available`)
    }

    const profile = createProfile(name, type, options as ConnectionProfile['options'])

    await saveProfile(profile)
    return profile
  })

  safeHandle('connections:update', async (payload) => {
    const { connectionId, name, type, options } = validateUpdateConnectionInput(payload)

    const profiles = await loadProfiles()
    const existingProfile = profiles.find((item) => item.id === connectionId)

    if (!existingProfile) {
      throw new ValidationError(`Connection profile "${connectionId}" not found`)
    }

    if (!adapterRegistry.getFactory(type)) {
      throw new ValidationError(`Adapter "${type}" is not available`)
    }

    // If connection is active and options changed, we should reconnect
    const isConnected = connectionManager.isConnected(connectionId)
    const optionsChanged =
      JSON.stringify(existingProfile.options) !== JSON.stringify(options) ||
      existingProfile.type !== type

    if (isConnected && optionsChanged) {
      await connectionManager.closeConnection(connectionId).catch(() => {})
    }

    const updatedProfile = {
      ...existingProfile,
      name,
      type,
      options: options as ConnectionProfile['options'],
      updatedAt: new Date()
    } as ConnectionProfile

    await saveProfile(updatedProfile)
    return updatedProfile
  })

  safeHandle('connections:connect', async (payload) => {
    const { connectionId } = validateConnectionIdentifier(payload)
    const profiles = await loadProfiles()
    const profile = profiles.find((item) => item.id === connectionId)

    if (!profile) {
      throw new ValidationError(`Connection profile "${connectionId}" not found`)
    }

    try {
      await connectionManager.createConnection(profile.id, profile.type, profile.options)
    } catch (error) {
      throw new ConnectionError(`Failed to connect to "${profile.name}"`, error)
    }

    const updatedProfile: ConnectionProfile = {
      ...profile,
      updatedAt: new Date(),
      lastConnectedAt: new Date()
    }
    await saveProfile(updatedProfile)

    return { success: true, connectionId: profile.id }
  })

  safeHandle('connections:disconnect', async (payload) => {
    const { connectionId } = validateConnectionIdentifier(payload)

    if (!connectionManager.isConnected(connectionId)) {
      return { success: true }
    }

    await connectionManager.closeConnection(connectionId)
    return { success: true }
  })

  safeHandle('connections:delete', async (payload) => {
    const { connectionId } = validateConnectionIdentifier(payload)

    await connectionManager.closeConnection(connectionId).catch(() => {})
    await deleteProfile(connectionId)
    await deleteWorkspace(connectionId).catch(() => {}) // Clean up workspace data
    await deleteAllQueriesForConnection(connectionId).catch(() => {}) // Clean up saved queries

    return { success: true }
  })

  safeHandle('query:run', async (payload): Promise<QueryResult> => {
    const { connectionId, query } = validateQueryInput(payload)
    const adapter = connectionManager.getConnection(connectionId)

    if (!adapter) {
      throw new ConnectionError(`Connection "${connectionId}" is not established`)
    }

    try {
      return await adapter.runQuery(query)
    } catch (error) {
      throw new QueryError('Failed to execute query', error)
    }
  })

  safeHandle('schema:list', async (payload): Promise<string[]> => {
    const { connectionId } = validateSchemaInput(payload) as { connectionId: string }
    const adapter = ensureSQLAdapter(connectionManager.getSQLConnection(connectionId), connectionId)

    return adapter.listSchemas()
  })

  safeHandle('schema:tables', async (payload): Promise<string[]> => {
    const { connectionId, schema } = validateSchemaInput(payload, { requireSchema: true }) as {
      connectionId: string
      schema: string
    }
    const adapter = ensureSQLAdapter(connectionManager.getSQLConnection(connectionId), connectionId)

    return adapter.listTables(schema)
  })

  safeHandle('schema:listWithTables', async (payload): Promise<SchemaWithTables[]> => {
    const { connectionId } = validateSchemaInput(payload) as { connectionId: string }
    const adapter = ensureSQLAdapter(connectionManager.getSQLConnection(connectionId), connectionId)

    return adapter.listSchemaWithTables()
  })

  safeHandle('schema:introspect', async (payload): Promise<TableInfo> => {
    const { connectionId, schema, table } = validateSchemaInput(payload, {
      requireSchema: true,
      requireTable: true
    }) as {
      connectionId: string
      schema: string
      table: string
    }

    const adapter = ensureSQLAdapter(connectionManager.getSQLConnection(connectionId), connectionId)

    return adapter.introspectTable(schema, table)
  })

  safeHandle('table:data', async (payload): Promise<TableDataResult> => {
    const { connectionId, schema, table, limit, offset, sortRules, filters } =
      validateTableDataInput(payload)
    const adapter = ensureSQLAdapter(connectionManager.getSQLConnection(connectionId), connectionId)

    const options: TableDataOptions = {
      schema,
      table,
      limit,
      offset
    }

    if (sortRules && sortRules.length > 0) {
      options.sortRules = sortRules
    }

    if (filters && filters.length > 0) {
      options.filters = filters
    }

    return adapter.fetchTableData(options)
  })

  safeHandle('table:deleteRows', async (payload): Promise<DeleteTableRowsResult> => {
    const { connectionId, schema, table, rows } = validateDeleteRowsInput(payload)
    const adapter = ensureSQLAdapter(connectionManager.getSQLConnection(connectionId), connectionId)

    return adapter.deleteTableRows({
      schema,
      table,
      rows
    })
  })

  safeHandle('table:updateCell', async (payload): Promise<UpdateTableCellResult> => {
    const { connectionId, schema, table, columnToUpdate, newValue, row } =
      validateUpdateCellInput(payload)
    const adapter = ensureSQLAdapter(connectionManager.getSQLConnection(connectionId), connectionId)

    return adapter.updateTableCell({
      schema,
      table,
      columnToUpdate,
      newValue,
      row
    })
  })

  // Workspace handlers
  safeHandle('workspace:load', async (payload): Promise<ConnectionWorkspace | undefined> => {
    const { connectionId } = validateConnectionIdentifier(payload)
    return loadWorkspace(connectionId)
  })

  safeHandle('workspace:save', async (payload): Promise<void> => {
    const { workspace } = validateWorkspaceInput(payload)
    return saveWorkspace(workspace)
  })

  safeHandle('workspace:delete', async (payload): Promise<void> => {
    const { connectionId } = validateConnectionIdentifier(payload)
    return deleteWorkspace(connectionId)
  })

  // Saved queries handlers
  safeHandle(
    'queries:save',
    async (payload): Promise<SavedQuery> => {
      const { connectionId, name, content } = payload as {
        connectionId: string
        name: string
        content: string
      }

      if (!connectionId || typeof connectionId !== 'string') {
        throw new ValidationError('connectionId is required')
      }
      if (!name || typeof name !== 'string') {
        throw new ValidationError('Query name is required')
      }
      if (!content || typeof content !== 'string') {
        throw new ValidationError('Query content is required')
      }

      return saveQuery(connectionId, name, content)
    }
  )

  safeHandle('queries:load', async (payload): Promise<SavedQuery[]> => {
    const { connectionId } = validateConnectionIdentifier(payload)
    return loadQueries(connectionId)
  })

  safeHandle('queries:delete', async (payload): Promise<void> => {
    const { connectionId, queryId } = payload as { connectionId: string; queryId: string }

    if (!connectionId || typeof connectionId !== 'string') {
      throw new ValidationError('connectionId is required')
    }
    if (!queryId || typeof queryId !== 'string') {
      throw new ValidationError('queryId is required')
    }

    return deleteQuery(connectionId, queryId)
  })

  safeHandle('queries:update', async (payload): Promise<SavedQuery | undefined> => {
    const { connectionId, queryId, name, content } = payload as {
      connectionId: string
      queryId: string
      name: string
      content: string
    }

    if (!connectionId || typeof connectionId !== 'string') {
      throw new ValidationError('connectionId is required')
    }
    if (!queryId || typeof queryId !== 'string') {
      throw new ValidationError('queryId is required')
    }
    if (!name || typeof name !== 'string') {
      throw new ValidationError('Query name is required')
    }
    if (!content || typeof content !== 'string') {
      throw new ValidationError('Query content is required')
    }

    return updateQuery(connectionId, queryId, name, content)
  })
}