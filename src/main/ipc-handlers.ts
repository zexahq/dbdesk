import { randomUUID } from 'node:crypto'
import { ipcMain } from 'electron'
import type {
  ConnectionProfile,
  DatabaseType,
  QueryResult,
  SQLAdapter,
  TableInfo
} from '@common/types'
import { connectionManager } from './connectionManager'
import { adapterRegistry, listRegisteredAdapters } from './adapters'
import { deleteProfile, getProfile, loadProfiles, saveProfile } from './storage'
import {
  validateConnectionIdentifier,
  validateCreateConnectionInput,
  validateQueryInput,
  validateSchemaInput
} from './utils/validation'
import { ConnectionError, QueryError, ValidationError, sanitizeError } from './utils/errors'

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
}
