import type { ConnectionProfile, DatabaseType } from '@dbdesk/shared/types'
import { createConnectionSchema } from '@dbdesk/shared/schemas'
import { dialog } from 'electron'
import { randomUUID } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { userInfo } from 'node:os'
import { Client } from 'pg'
import { z } from 'zod'
import { adapterRegistry } from '../adapters'
import { connectionManager } from '../connectionManager'
import { deleteAllDashboardsForConnection } from '../dashboard-storage'
import { deleteAllQueriesForConnection } from '../saved-queries-storage'
import {
  deleteProfile,
  getProfile,
  loadProfiles,
  saveProfile,
  splitConnectionOptions
} from '../storage'
import { ConnectionError, ValidationError } from '../utils/errors'
import { deleteWorkspace } from '../workspace-storage'
import { typedHandle } from './typed-handle'

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

const connectionExportSchema = z.object({
  version: z.literal(1),
  connections: z.array(
    z.object({
      name: z.string().min(1),
      type: z.enum(['postgres', 'mongodb', 'redis']),
      options: z.record(z.string(), z.unknown())
    })
  )
})

const discoverLocalPostgres = async () => {
  const hosts =
    process.platform === 'win32' ? ['localhost'] : ['/var/run/postgresql', '/tmp', 'localhost']
  const ports = [5432, 5433]
  const users = Array.from(new Set([userInfo().username, 'postgres']))
  const attempts = hosts.flatMap((host) =>
    ports.flatMap((port) => users.map((user) => ({ host, port, user })))
  )

  const results = await Promise.allSettled(
    attempts.map(async ({ host, port, user }) => {
      const client = new Client({
        host,
        port,
        database: 'postgres',
        user,
        connectionTimeoutMillis: 1200,
        ssl: false
      })
      try {
        await client.connect()
        const result = await client.query<{ datname: string }>(
          'SELECT datname FROM pg_database WHERE datallowconn AND NOT datistemplate ORDER BY datname'
        )
        return result.rows.map(({ datname }) => ({ host, port, user, database: datname }))
      } finally {
        await client.end().catch(() => {})
      }
    })
  )

  const databases = new Map<
    string,
    { host: string; port: number; user: string; database: string }
  >()
  for (const result of results) {
    if (result.status !== 'fulfilled') continue
    for (const database of result.value) {
      const key = `${database.host}:${database.port}/${database.database}`
      if (!databases.has(key)) databases.set(key, database)
    }
  }

  return Array.from(databases.values()).map(({ host, port, user, database }) => ({
    name: database,
    options: { host, port, database, user, password: '', sslMode: 'disable' as const }
  }))
}

export function registerConnectionHandlers() {
  typedHandle('connections:list', async () => loadProfiles())

  typedHandle('connections:get', async ({ connectionId }) => {
    const profile = await getProfile(connectionId)
    if (!profile) throw new ValidationError(`Connection profile "${connectionId}" not found`)
    return profile
  })

  typedHandle('connections:create', async ({ name, type, options }) => {
    if (!adapterRegistry.getFactory(type)) {
      throw new ValidationError(`Adapter "${type}" is not available`)
    }
    const profile = createProfile(name, type, options as ConnectionProfile['options'])
    await saveProfile(profile)
    return profile
  })

  typedHandle('connections:update', async ({ connectionId, name, type, options }) => {
    const profiles = await loadProfiles()
    const existing = profiles.find((p) => p.id === connectionId)
    if (!existing) throw new ValidationError(`Connection profile "${connectionId}" not found`)
    if (!adapterRegistry.getFactory(type))
      throw new ValidationError(`Adapter "${type}" is not available`)

    const isConnected = connectionManager.isConnected(connectionId)
    const optionsChanged =
      JSON.stringify(existing.options) !== JSON.stringify(options) || existing.type !== type

    if (isConnected && optionsChanged) {
      await connectionManager.closeConnection(connectionId).catch(() => {})
    }

    const updated = {
      ...existing,
      name,
      type,
      options: options as ConnectionProfile['options'],
      updatedAt: new Date()
    } as ConnectionProfile

    await saveProfile(updated)
    return updated
  })

  typedHandle('connections:connect', async ({ connectionId }) => {
    const profiles = await loadProfiles()
    const profile = profiles.find((p) => p.id === connectionId)
    if (!profile) throw new ValidationError(`Connection profile "${connectionId}" not found`)

    try {
      await connectionManager.createConnection(profile.id, profile.type, profile.options)
    } catch (error) {
      throw new ConnectionError(`Failed to connect to "${profile.name}"`, error)
    }

    const updated: ConnectionProfile = {
      ...profile,
      updatedAt: new Date(),
      lastConnectedAt: new Date()
    }
    await saveProfile(updated)
    return { success: true, connectionId: profile.id }
  })

  typedHandle('connections:disconnect', async ({ connectionId }) => {
    if (!connectionManager.isConnected(connectionId)) return { success: true }
    await connectionManager.closeConnection(connectionId)
    return { success: true }
  })

  typedHandle('connections:delete', async ({ connectionId }) => {
    await connectionManager.closeConnection(connectionId).catch(() => {})
    await deleteProfile(connectionId)
    await deleteWorkspace(connectionId).catch(() => {})
    await deleteAllQueriesForConnection(connectionId).catch(() => {})
    await deleteAllDashboardsForConnection(connectionId).catch(() => {})
    return { success: true }
  })

  typedHandle('connections:export', async () => {
    const profiles = await loadProfiles()
    const result = await dialog.showSaveDialog({
      defaultPath: 'dbdesk-connections.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (result.canceled || !result.filePath) return { exported: 0 }

    const connections = profiles.map((profile) => ({
      name: profile.name,
      type: profile.type,
      options: splitConnectionOptions(profile.options as unknown as Record<string, unknown>)
        .publicOptions
    }))
    await writeFile(result.filePath, JSON.stringify({ version: 1, connections }, null, 2), 'utf8')
    return { exported: connections.length, filePath: result.filePath }
  })

  typedHandle('connections:import', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    const filePath = result.filePaths[0]
    if (result.canceled || !filePath) return []

    const parsed = connectionExportSchema.parse(JSON.parse(await readFile(filePath, 'utf8')))
    const imported = parsed.connections.map((input) => {
      const normalized = createConnectionSchema.parse({
        ...input,
        options: input.type === 'postgres' ? { ...input.options, password: '' } : input.options
      })
      const profile = createProfile(
        normalized.name,
        normalized.type,
        normalized.options as ConnectionProfile['options']
      )
      return profile
    })
    const saved: ConnectionProfile[] = []
    try {
      for (const profile of imported) {
        await saveProfile(profile)
        saved.push(profile)
      }
    } catch (error) {
      await Promise.all(saved.map((profile) => deleteProfile(profile.id).catch(() => {})))
      throw error
    }
    return imported
  })

  typedHandle('connections:discover-local', discoverLocalPostgres)
}
