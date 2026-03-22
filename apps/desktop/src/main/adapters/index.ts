import type { DBConnectionOptions, DatabaseType } from '@dbdesk/shared/types'
import { createPostgresAdapter } from './postgres'
import { adapterRegistry } from './registry'

// Register core adapters on module load.
adapterRegistry.registerAdapter('postgres', createPostgresAdapter)

export { PostgresAdapter, createPostgresAdapter } from './postgres'
export { adapterRegistry } from './registry'

export const registerAdapter = adapterRegistry.registerAdapter.bind(adapterRegistry)

export const listRegisteredAdapters = (): DatabaseType[] => adapterRegistry.listAdapters()

export const createAdapter = (type: DatabaseType, options: DBConnectionOptions) =>
  adapterRegistry.createAdapter(type, options)
