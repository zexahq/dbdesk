import {
  deduplicateLocalDatabases,
  getLocalDatabaseKey,
  isLocalDatabaseHost
} from '@dbdesk/shared/utils/local-database-discovery'
import { localDatabaseDiscoverySchema } from '@dbdesk/shared/schemas'
import { describe, expect, it } from 'vitest'

describe('local database discovery', () => {
  it('deduplicates the same database across local socket and TCP attempts', () => {
    const databases = deduplicateLocalDatabases([
      { host: '/var/run/postgresql', port: 5432, database: 'app', user: 'developer' },
      { host: 'localhost', port: 5432, database: 'app', user: 'postgres' },
      { host: 'localhost', port: 5432, database: 'analytics', user: 'postgres' }
    ])

    expect(databases).toHaveLength(2)
    expect(databases[0]?.host).toBe('/var/run/postgresql')
    expect(getLocalDatabaseKey(databases[1]!)).toBe('5432/analytics')
  })

  it('recognizes local hosts and validates the requested port', () => {
    expect(isLocalDatabaseHost('localhost')).toBe(true)
    expect(isLocalDatabaseHost('/tmp')).toBe(true)
    expect(isLocalDatabaseHost('db.example.com')).toBe(false)
    expect(localDatabaseDiscoverySchema.safeParse({ port: 5432 }).success).toBe(true)
    expect(localDatabaseDiscoverySchema.safeParse({ port: 0 }).success).toBe(false)
    expect(localDatabaseDiscoverySchema.safeParse({ port: 65536 }).success).toBe(false)
  })
})
