import type { DBAdapter, DBConnectionOptions, DatabaseType, SQLAdapter } from '@common/types'
import { adapterRegistry } from './adapters'

export class ConnectionManager {
  private static instance: ConnectionManager

  private readonly connections = new Map<string, DBAdapter>()

  private constructor() {}

  public static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager()
    }

    return ConnectionManager.instance
  }

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

  public async closeConnection(profileId: string): Promise<void> {
    const adapter = this.connections.get(profileId)
    if (!adapter) {
      return
    }

    this.connections.delete(profileId)
    await adapter.disconnect().catch(() => {})
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
