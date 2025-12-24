import type {
  ConnectionProfile,
  DBAdapter,
  DBConnectionOptions,
  DatabaseType,
  SQLAdapter
} from '@common/types'
import { adapterRegistry } from './adapters'
import {
  deleteProfile as deleteProfileFromDisk,
  loadProfiles,
  saveProfile as saveProfileToDisk
} from './storage'

export class ConnectionManager {
  private static instance: ConnectionManager

  private readonly connections = new Map<string, DBAdapter>()
  private profiles = new Map<string, ConnectionProfile>()

  // Load persisted profiles (async) during initialization
  private async initializeProfiles(): Promise<void> {
    try {
      const stored = await loadProfiles()
      for (const p of stored) {
        this.profiles.set(p.id, p)
      }
    } catch (err) {
      // Non-fatal: continue with empty profiles
      console.warn('Failed to load persisted profiles:', err)
    }
  }

  public static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager()
      // populate profiles from disk immediately after construction
      ConnectionManager.instance.initializeProfiles()
    }

    return ConnectionManager.instance
  }

  // ========================================================================
  // Profile Management (for server)
  // ========================================================================
  public createProfile(
    name: string,
    type: DatabaseType,
    options: DBConnectionOptions
  ): ConnectionProfile {
    const id = `profile_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    const now = new Date()
    const profile = { id, name, type, options, createdAt: now, updatedAt: now } as ConnectionProfile
    this.profiles.set(id, profile)
    // Persist in background
    void saveProfileToDisk(profile).catch((err) => {
      console.warn('Failed to save profile:', err)
    })
    return profile
  }

  public getProfile(profileId: string) {
    return this.profiles.get(profileId)
  }

  public listProfiles() {
    return Array.from(this.profiles.values())
  }

  public updateProfile(
    profileId: string,
    name: string,
    type: DatabaseType,
    options: DBConnectionOptions
  ): ConnectionProfile {
    const existing = this.profiles.get(profileId)
    if (!existing) {
      throw new Error(`Profile ${profileId} not found`)
    }
    const updated = { ...existing, name, type, options, updatedAt: new Date() } as ConnectionProfile
    this.profiles.set(profileId, updated)
    void saveProfileToDisk(updated).catch((err) => {
      console.warn('Failed to save profile:', err)
    })
    return updated
  }

  public deleteProfile(profileId: string) {
    this.profiles.delete(profileId)
    void deleteProfileFromDisk(profileId).catch((err) => {
      console.warn('Failed to delete profile:', err)
    })
  }

  // ========================================================================
  // Connection Management
  // ========================================================================
  public async createConnection(
    profileId: string,
    type: DatabaseType,
    options: DBConnectionOptions
  ): Promise<DBAdapter> {
    if (!profileId) {
      throw new Error('profileId is required to create a connection')
    }

    const existingConnection = this.connections.get(profileId)
    if (existingConnection) {
      return existingConnection
    }

    const adapter = adapterRegistry.createAdapter(type, options)

    try {
      await adapter.connect()
      this.connections.set(profileId, adapter)
      return adapter
    } catch (error) {
      await adapter.disconnect().catch(() => {})
      throw error
    }
  }

  public getConnection(profileId: string): DBAdapter | undefined {
    return this.connections.get(profileId)
  }

  public getSQLConnection(profileId: string): SQLAdapter | undefined {
    const adapter = this.getConnection(profileId)
    if (adapter && this.isSQLAdapter(adapter)) {
      return adapter
    }
    return undefined
  }

  public async disconnectConnection(profileId: string): Promise<void> {
    const adapter = this.connections.get(profileId)
    if (!adapter) {
      return
    }

    this.connections.delete(profileId)
    await adapter.disconnect().catch(() => {})
  }

  public async closeConnection(profileId: string): Promise<void> {
    await this.disconnectConnection(profileId)
  }

  public async closeAll(): Promise<void> {
    const closePromises = Array.from(this.connections.entries()).map(
      async ([profileId, adapter]) => {
        this.connections.delete(profileId)
        await adapter.disconnect().catch(() => {})
      }
    )

    await Promise.all(closePromises)
  }

  public listConnections(): string[] {
    return Array.from(this.connections.keys())
  }

  public isConnected(profileId: string): boolean {
    return this.connections.has(profileId)
  }

  private isSQLAdapter(adapter: DBAdapter): adapter is SQLAdapter {
    return typeof (adapter as SQLAdapter).listSchemas === 'function'
  }
}

export const connectionManager = ConnectionManager.getInstance()
