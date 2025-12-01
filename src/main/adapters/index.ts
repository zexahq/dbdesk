import type { DBConnectionOptions, DatabaseType } from '@common/types'
import { createMySQLAdapter } from './mysql'
import { createPostgresAdapter } from './postgres'
import { adapterRegistry } from './registry'

// Register core adapters on module load.
adapterRegistry.registerAdapter('postgres', createPostgresAdapter)
adapterRegistry.registerAdapter('mysql', createMySQLAdapter)

export { MySQLAdapter, createMySQLAdapter } from './mysql'
export { PostgresAdapter, createPostgresAdapter } from './postgres'
export { adapterRegistry } from './registry'

export const registerAdapter = adapterRegistry.registerAdapter.bind(adapterRegistry)

export const listRegisteredAdapters = (): DatabaseType[] => adapterRegistry.listAdapters()

export const createAdapter = (type: DatabaseType, options: DBConnectionOptions) =>
  adapterRegistry.createAdapter(type, options)
