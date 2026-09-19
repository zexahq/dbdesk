import type { DBAdapter, DBConnectionOptions, DatabaseType, SQLAdapter } from '@dbdesk/shared/types'
import { adapterRegistry } from './adapters'

export class ConnectionManager {
  private static instance: ConnectionManager

  private readonly connections = new Map<string, DBAdapter>()
  private readonly configurations = new Map<
    string,
    { type: DatabaseType; options: DBConnectionOptions }
  >()
  private reconnecting = false

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

    const previousConfiguration = this.configurations.get(profileId)
    this.configurations.set(profileId, { type, options })
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
      if (previousConfiguration) this.configurations.set(profileId, previousConfiguration)
      else this.configurations.delete(profileId)
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
    this.configurations.delete(profileId)
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
    this.configurations.clear()
  }

  public async reconnectAll(): Promise<void> {
    if (this.reconnecting) return
    this.reconnecting = true
    try {
      const configurations = Array.from(this.configurations.entries())
      const adapters = Array.from(this.connections.values())
      this.connections.clear()
      await Promise.all(adapters.map((adapter) => adapter.disconnect().catch(() => {})))
      await Promise.allSettled(
        configurations.map(([profileId, config]) => this.reconnectConfigured(profileId, config))
      )
    } finally {
      this.reconnecting = false
    }
  }

  public async reconnectDisconnected(): Promise<void> {
    if (this.reconnecting) return
    this.reconnecting = true
    try {
      const disconnected = Array.from(this.configurations.entries()).filter(([profileId]) => {
        const adapter = this.connections.get(profileId)
        return !adapter || adapter.isHealthy?.() === false
      })

      await Promise.allSettled(
        disconnected.map(async ([profileId, config]) => {
          const adapter = this.connections.get(profileId)
          this.connections.delete(profileId)
          await adapter?.disconnect().catch(() => {})
          await this.reconnectConfigured(profileId, config)
        })
      )
    } finally {
      this.reconnecting = false
    }
  }

  public listConnections(): string[] {
    return Array.from(this.connections.keys())
  }

  public isConnected(profileId: string): boolean {
    return this.connections.has(profileId)
  }

  private async reconnectConfigured(
    profileId: string,
    config: { type: DatabaseType; options: DBConnectionOptions }
  ): Promise<void> {
    if (this.configurations.get(profileId) !== config) return

    const adapter = adapterRegistry.createAdapter(config.type, config.options)
    try {
      await adapter.connect()
      if (this.configurations.get(profileId) !== config) {
        await adapter.disconnect().catch(() => {})
        return
      }
      this.connections.set(profileId, adapter)
    } catch (error) {
      await adapter.disconnect().catch(() => {})
      throw error
    }
  }

  private isSQLAdapter(adapter: DBAdapter): adapter is SQLAdapter {
    return typeof (adapter as SQLAdapter).listSchemas === 'function'
  }
}

export const connectionManager = ConnectionManager.getInstance()
