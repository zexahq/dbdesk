import type { ConnectionProfile, DatabaseType } from '@dbdesk/shared/types'
import { randomUUID } from 'node:crypto'
import { adapterRegistry } from '../adapters'
import { connectionManager } from '../connectionManager'
import { deleteAllDashboardsForConnection } from '../dashboard-yaml-storage'
import { deleteAllQueriesForConnection } from '../saved-queries-storage'
import { deleteProfile, getProfile, loadProfiles, saveProfile } from '../storage'
import { ConnectionError, ValidationError } from '../utils/errors'
import { deleteWorkspace } from '../workspace-storage'
import { typedHandle } from './typed-handle'

const createProfile = (
  name: string,
  type: DatabaseType,
  options: ConnectionProfile['options'],
): ConnectionProfile => {
  const now = new Date()
  return {
    id: randomUUID(),
    name,
    type,
    options,
    createdAt: now,
    updatedAt: now,
  } as ConnectionProfile
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
      updatedAt: new Date(),
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
      lastConnectedAt: new Date(),
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
}
