import type { DBAdapter, DBConnectionOptions, DatabaseType, SQLAdapter } from '@common/types'
import { adapterRegistry } from './adapters'
import {
  readProfilesFromDiskSync,
  writeProfilesToDisk,
  type StoredProfiles
} from './profiles-storage'

export class ConnectionManager {
  private static instance: ConnectionManager

  private readonly connections = new Map<string, DBAdapter>()
  private profiles = new Map<
    string,
    {
      id: string
      name: string
      type: DatabaseType
      options: DBConnectionOptions
    }
  >()

  private constructor() {}

  // Load persisted profiles (sync) during initialization
  private initializeProfiles() {
    try {
      const stored = readProfilesFromDiskSync()
      for (const [id, p] of Object.entries(stored)) {
        this.profiles.set(id, p as any)
      }
    } catch (err) {
      // Non-fatal: continue with empty profiles
      // eslint-disable-next-line no-console
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
  public createProfile(name: string, type: DatabaseType, options: DBConnectionOptions) {
    const id = `profile_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    const profile = { id, name, type, options }
    this.profiles.set(id, profile)
    // Persist in background
    void this.persistProfiles()
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
  ) {
    const profile = this.profiles.get(profileId)
    if (!profile) {
      throw new Error(`Profile ${profileId} not found`)
    }
    const updated = { id: profileId, name, type, options }
    this.profiles.set(profileId, updated)
    void this.persistProfiles()
    return updated
  }

  public deleteProfile(profileId: string) {
    this.profiles.delete(profileId)
    void this.persistProfiles()
  }

  private async persistProfiles(): Promise<void> {
    try {
      const obj: StoredProfiles = Object.fromEntries(this.profiles)
      await writeProfilesToDisk(obj)
    } catch (err) {
      // Best-effort persistence; log and continue
      // eslint-disable-next-line no-console
      console.warn('Failed to persist profiles:', err)
    }
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
