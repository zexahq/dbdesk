import type { DBConnectionOptions, DatabaseType } from '@common/types'
import { adapterRegistry } from './registry'
import { createPostgresAdapter } from './postgres'

// Register core adapters on module load.
adapterRegistry.registerAdapter('postgres', createPostgresAdapter)

export { adapterRegistry } from './registry'
export { PostgresAdapter, createPostgresAdapter } from './postgres'

export const registerAdapter = adapterRegistry.registerAdapter.bind(adapterRegistry)

export const listRegisteredAdapters = (): DatabaseType[] => adapterRegistry.listAdapters()

export const createAdapter = (type: DatabaseType, options: DBConnectionOptions) =>
  adapterRegistry.createAdapter(type, options)
