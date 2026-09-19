import {
  listConnections,
  getConnection,
  addConnection,
  removeConnection,
  resolveConnection
} from '../lib/db-access'
import { getAdapter, disconnectAll } from '../lib/adapter-pool'
import { runAction } from '../lib/output'
import { CliError } from '../lib/errors'
import { postgreSQLSslModeSchema } from '@dbdesk/shared/schemas'
import type { Command } from 'commander'

function safeProfile(conn: NonNullable<ReturnType<typeof getConnection>>) {
  const opts = conn.options as unknown as Record<string, unknown>
  return {
    id: conn.id,
    name: conn.name,
    type: conn.type,
    host: opts.host ?? null,
    port: opts.port ?? null,
    database: opts.database ?? null,
    user: opts.user ?? null,
    sslMode: opts.sslMode ?? 'disable',
    hasPassword: Boolean(opts.password),
    createdAt: conn.createdAt,
    updatedAt: conn.updatedAt,
    lastConnectedAt: conn.lastConnectedAt ?? null
  }
}

export function registerConnectionCommands(program: Command): void {
  const connCmd = program.command('connection').description('Manage database connections')

  connCmd
    .command('list')
    .description('List all saved database connections')
    .option('--format <format>', 'output format: table (default) or json', 'table')
    .action((opts: { format: string }) =>
      runAction(opts, ['table', 'json'], () =>
        listConnections().map((c) => {
          const o = c.options as unknown as Record<string, unknown>
          return {
            id: c.id,
            name: c.name,
            type: c.type,
            host: o.host ?? '-',
            port: o.port ?? '-',
            database: o.database ?? '-',
            user: o.user ?? '-'
          }
        })
      )
    )

  connCmd
    .command('show <name-or-id>')
    .description('Show details for a connection (passwords are never shown)')
    .option('--format <format>', 'output format: table (default) or json', 'table')
    .action((nameOrId: string, opts: { format: string }) =>
      runAction(opts, ['table', 'json'], () => {
        const conn = getConnection(nameOrId)
        if (!conn) {
          throw new CliError(
            'not-found',
            `Connection "${nameOrId}" not found.`,
            'Use "dbdesk connection list" to see available connections.'
          )
        }
        return safeProfile(conn)
      })
    )

  connCmd
    .command('add')
    .description('Add Postgres connection metadata (credentials stay in ~/.pgpass or environment)')
    .requiredOption('-n, --name <name>', 'connection name (e.g. "Production")')
    .requiredOption('--host <host>', 'database host', 'localhost')
    .option('-p, --port <port>', 'database port', '5432')
    .requiredOption('-d, --database <name>', 'database name')
    .requiredOption('-u, --user <user>', 'database user')
    .option(
      '--ssl-mode <mode>',
      'SSL mode: disable, allow, prefer, require, verify-ca, verify-full',
      'disable'
    )
    .option('--format <format>', 'output format: table (default) or json', 'table')
    .action(
      (opts: {
        name: string
        host: string
        port: string
        database: string
        user: string
        sslMode: string
        format: string
      }) =>
        runAction(opts, ['table', 'json'], async () => {
          const port = Number(opts.port)
          if (!Number.isInteger(port) || port <= 0 || port > 65535) {
            throw new CliError('usage', `Invalid port "${opts.port}".`)
          }
          const sslMode = postgreSQLSslModeSchema.safeParse(opts.sslMode)
          if (!sslMode.success) {
            throw new CliError('usage', `Invalid SSL mode "${opts.sslMode}".`)
          }
          for (const [field, value] of Object.entries({
            name: opts.name,
            host: opts.host,
            database: opts.database,
            user: opts.user
          })) {
            if (!value.trim()) throw new CliError('usage', `${field} cannot be empty.`)
          }
          // The CLI never accepts or decrypts desktop credentials. libpq-style
          // environment variables and ~/.pgpass remain available to the driver.
          const profile = addConnection({
            name: opts.name.trim(),
            host: opts.host.trim(),
            port,
            database: opts.database.trim(),
            user: opts.user.trim(),
            sslMode: sslMode.data
          })
          return {
            id: profile.id,
            name: profile.name,
            type: profile.type,
            message:
              `Connection "${profile.name}" added without a password. ` +
              `Configure ~/.pgpass (or PGPASSWORD), ` +
              `then verify with "dbdesk connection test ${profile.name}".`
          }
        })
    )

  connCmd
    .command('remove <name-or-id>')
    .description('Remove a database connection (and its dashboards)')
    .option('--format <format>', 'output format: table (default) or json', 'table')
    .action((nameOrId: string, opts: { format: string }) =>
      runAction(opts, ['table', 'json'], () => {
        removeConnection(nameOrId)
        return { removed: nameOrId, message: `Connection "${nameOrId}" removed.` }
      })
    )

  connCmd
    .command('test [name-or-id]')
    .description('Test connectivity for a connection')
    .option('-c, --connection <name-or-id>', 'connection name or ID (or set DBDESK_CONNECTION)')
    .option('--format <format>', 'output format: table (default) or json', 'table')
    .action((nameOrId: string | undefined, opts: { connection?: string; format: string }) =>
      runAction(opts, ['table', 'json'], async () => {
        const ref = nameOrId ?? opts.connection ?? process.env.DBDESK_CONNECTION
        if (!ref) {
          throw new CliError(
            'usage',
            'No connection specified.',
            'Pass a name/ID or set DBDESK_CONNECTION.'
          )
        }
        const conn = resolveConnection(ref)
        const hasPassword = Boolean((conn.options as unknown as Record<string, unknown>).password)
        const adapter = await getAdapter(conn).catch((err: unknown) => {
          throw new CliError(
            'connection-failed',
            `Could not connect to "${conn.name}": ${err instanceof Error ? err.message : String(err)}`,
            !hasPassword
              ? 'Desktop credentials are OS-encrypted and unavailable to the CLI. Configure ~/.pgpass or PGPASSWORD.'
              : 'Check host/port/database/user and that the server accepts remote connections.'
          )
        })
        const start = Date.now()
        try {
          await adapter.runQuery('SELECT 1', { readOnly: true })
        } finally {
          await disconnectAll().catch(() => {})
        }
        return { name: conn.name, reachable: true, latency_ms: Date.now() - start }
      })
    )
}
