import type { DBAdapter, SQLConnectionProfile } from '@dbdesk/shared/types'
import { describe, expect, it, vi } from 'vitest'
import {
  PostgresAdapter,
  buildPostgresSslConfig,
  buildPostgresToolEnv,
  getPostgresSslConnectionModes
} from '../../../packages/shared/src/adapters/postgres'
import { isReadOnlyQuery } from '../../../packages/shared/src/adapters/sql-parser'
import { buildSshArgs, expandHomePath } from '../../../packages/shared/src/adapters/ssh-tunnel'
import { requiresSqlConfirmation } from '../src/renderer/src/features/editor/lib/sql-parser'
import { adapterRegistry } from '../src/main/adapters'
import { ConnectionManager } from '../src/main/connectionManager'
import { assertConnectionWritable, shouldRunReadOnly } from '../src/main/lib/query-safety'

const profile = (readOnly: boolean): SQLConnectionProfile => ({
  id: crypto.randomUUID(),
  name: 'Production',
  type: 'postgres',
  options: {
    host: 'db.internal',
    port: 5432,
    database: 'app',
    user: 'app',
    password: '',
    readOnly
  },
  createdAt: new Date(),
  updatedAt: new Date()
})

describe('production connection builders', () => {
  it('builds a non-interactive OpenSSH tunnel command without a shell', () => {
    expect(
      buildSshArgs(
        { enabled: true, host: 'bastion', port: 2222, user: 'deploy' },
        { host: 'db.internal', port: 5432 },
        15432
      )
    ).toEqual([
      '-N',
      '-T',
      '-o',
      'BatchMode=yes',
      '-o',
      'ExitOnForwardFailure=yes',
      '-o',
      'ServerAliveInterval=30',
      '-o',
      'ServerAliveCountMax=3',
      '-L',
      '127.0.0.1:15432:db.internal:5432',
      '-p',
      '2222',
      'deploy@bastion'
    ])
    expect(expandHomePath('~/.ssh/id_ed25519', '/home/test')).toBe('/home/test/.ssh/id_ed25519')
  })

  it('builds certificate-verifying TLS modes', () => {
    const readFile = (path: string) => Buffer.from(path)
    const verifyCa = buildPostgresSslConfig(
      { host: 'db.internal', sslMode: 'verify-ca', sslRootCertPath: '/certs/root.crt' },
      readFile
    )
    const verifyFull = buildPostgresSslConfig(
      {
        host: 'db.internal',
        sslMode: 'verify-full',
        sslClientCertPath: '/certs/client.crt',
        sslClientKeyPath: '/certs/client.key'
      },
      readFile
    )

    expect(verifyCa).toMatchObject({
      ca: Buffer.from('/certs/root.crt'),
      rejectUnauthorized: true,
      checkServerIdentity: expect.any(Function)
    })
    expect(verifyFull).toMatchObject({
      cert: Buffer.from('/certs/client.crt'),
      key: Buffer.from('/certs/client.key'),
      rejectUnauthorized: true,
      servername: 'db.internal'
    })
    expect(
      buildPostgresSslConfig(
        { host: 'db.internal', sslMode: 'require', sslRootCertPath: '/certs/root.crt' },
        readFile
      )
    ).toMatchObject({
      rejectUnauthorized: true,
      checkServerIdentity: expect.any(Function)
    })
    expect(
      buildPostgresToolEnv({
        sslMode: 'verify-full',
        sslRootCertPath: '~/.postgresql/root.crt'
      })
    ).toMatchObject({ PGSSLMODE: 'verify-full' })
    expect(
      buildPostgresSslConfig(
        { host: 'db.internal', sslMode: 'disable', sslRootCertPath: '/missing.crt' },
        () => {
          throw new Error('must not read')
        }
      )
    ).toBe(false)
    expect(getPostgresSslConnectionModes('prefer')).toEqual(['require', 'disable'])
    expect(getPostgresSslConnectionModes('allow')).toEqual(['disable', 'require'])
  })

  it('enforces profile and caller read-only safety', () => {
    expect(shouldRunReadOnly(profile(true))).toBe(true)
    expect(shouldRunReadOnly(profile(false), true)).toBe(true)
    expect(() => assertConnectionWritable(profile(true))).toThrow('is read-only')
    expect(() => assertConnectionWritable(profile(false))).not.toThrow()
    expect(isReadOnlyQuery('SELECT * FROM users')).toBe(true)
    expect(isReadOnlyQuery('COMMIT; DELETE FROM users')).toBe(false)
    expect(isReadOnlyQuery('SELECT 1; DELETE FROM users')).toBe(false)
    expect(requiresSqlConfirmation(['SELECT 1'], false)).toBe(false)
    expect(requiresSqlConfirmation(['SELECT pg_terminate_backend(42)'], true)).toBe(true)
  })

  it('recovers a read-only batch after one statement fails', async () => {
    let aborted = false
    const queries: string[] = []
    const client = {
      query: vi.fn(async (sql: string) => {
        queries.push(sql)
        if (sql === 'ROLLBACK TO SAVEPOINT dbdesk_batch_statement') {
          aborted = false
          return { rows: [], fields: [], rowCount: 0, command: 'ROLLBACK' }
        }
        if (sql === 'ROLLBACK') {
          aborted = false
          return { rows: [], fields: [], rowCount: 0, command: 'ROLLBACK' }
        }
        if (aborted) throw new Error('current transaction is aborted')
        if (sql.includes('fail()')) {
          aborted = true
          throw new Error('intentional failure')
        }
        if (sql === 'SHOW work_mem') {
          return {
            rows: [{ work_mem: '4MB' }],
            fields: [{ name: 'work_mem' }],
            rowCount: 1,
            command: 'SHOW'
          }
        }
        return { rows: [], fields: [], rowCount: 0, command: '' }
      }),
      release: vi.fn()
    }
    const adapter = new PostgresAdapter(profile(true).options)
    ;(adapter as unknown as { pool: { connect: () => Promise<typeof client> } }).pool = {
      connect: async () => client
    }

    const results = await adapter.runManyQueries(['SELECT fail()', 'SHOW work_mem'], {
      readOnly: true
    })

    expect(results[0].error).toContain('intentional failure')
    expect(results[1].result?.rows).toEqual([{ work_mem: '4MB' }])
    expect(queries).toContain('ROLLBACK TO SAVEPOINT dbdesk_batch_statement')
  })

  it('does not reconnect a profile after an explicit disconnect wins the race', async () => {
    const originalFactory = adapterRegistry.getFactory('postgres')
    let finishDisconnect = () => {}
    let markDisconnectStarted = () => {}
    const disconnectStarted = new Promise<void>((resolve) => {
      markDisconnectStarted = resolve
    })
    const disconnectFinished = new Promise<void>((resolve) => {
      finishDisconnect = resolve
    })
    let adaptersCreated = 0
    const adapter = {
      connect: async () => {},
      disconnect: async () => {
        markDisconnectStarted()
        await disconnectFinished
      },
      isHealthy: () => false
    } as unknown as DBAdapter
    adapterRegistry.registerAdapter('postgres', () => {
      adaptersCreated++
      return adapter
    })

    const manager = new ConnectionManager()
    try {
      await manager.createConnection('profile-id', 'postgres', profile(false).options)
      const reconnect = manager.reconnectDisconnected()
      await disconnectStarted
      await manager.closeConnection('profile-id')
      finishDisconnect()
      await reconnect

      expect(manager.isConnected('profile-id')).toBe(false)
      expect(adaptersCreated).toBe(1)
    } finally {
      finishDisconnect()
      await manager.closeAll()
      if (originalFactory) adapterRegistry.registerAdapter('postgres', originalFactory)
    }
  })
})
