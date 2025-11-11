import type { DBAdapter, DBConnectionOptions, DatabaseType } from '@common/types'

export type AdapterFactory<TOptions extends DBConnectionOptions = DBConnectionOptions> = (
  options: TOptions
) => DBAdapter

/**
 * Registry responsible for managing database adapter factories.
 * Allows runtime registration and retrieval of adapters based
 * on the database type requested by the application.
 */
export class AdapterRegistry {
  private static instance: AdapterRegistry

  private readonly factories = new Map<DatabaseType, AdapterFactory>()

  private constructor() {}

  /**
   * Retrieve the singleton instance of the adapter registry.
   */
  public static getInstance(): AdapterRegistry {
    if (!AdapterRegistry.instance) {
      AdapterRegistry.instance = new AdapterRegistry()
    }

    return AdapterRegistry.instance
  }

  /**
   * Register a factory that can create adapters for a specific database type.
   */
  public registerAdapter<TOptions extends DBConnectionOptions>(
    type: DatabaseType,
    factory: AdapterFactory<TOptions>
  ): void {
    this.factories.set(type, factory as AdapterFactory)
  }

  /**
   * Returns the list of adapter types that have factories registered.
   */
  public listAdapters(): DatabaseType[] {
    return Array.from(this.factories.keys())
  }

  /**
   * Retrieve the factory for a given database type without creating an instance.
   */
  public getFactory(type: DatabaseType): AdapterFactory | undefined {
    return this.factories.get(type)
  }

  /**
   * Instantiate an adapter for the given database type using the provided connection options.
   * Throws if the requested adapter has not been registered.
   */
  public getAdapter<TOptions extends DBConnectionOptions>(
    type: DatabaseType,
    options: TOptions
  ): DBAdapter {
    const factory = this.factories.get(type)

    if (!factory) {
      throw new Error(`Adapter for database type "${type}" is not registered`)
    }

    return factory(options)
  }

  /**
   * Alias for getAdapter that mirrors the terminology used in the implementation plan.
   */
  public createAdapter<TOptions extends DBConnectionOptions>(
    type: DatabaseType,
    options: TOptions
  ): DBAdapter {
    return this.getAdapter(type, options)
  }
}

export const adapterRegistry = AdapterRegistry.getInstance()
