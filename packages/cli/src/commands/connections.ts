import { listConnections, getConnection, addConnection, removeConnection } from '../lib/db-access'
import { formatConnectionsTable, formatJson, formatResult } from '../lib/format'
import type { Command } from 'commander'

export function registerConnectionCommands(program: Command): void {
  const connCmd = program.command('connection').description('Manage database connections')

  connCmd
    .command('list')
    .description('List all saved database connections')
    .option('--format <format>', 'output format: table (default) or json', 'table')
    .action((opts: { format: string }) => {
      const connections = listConnections()
      if (opts.format === 'json') {
        console.log(formatResult(connections, 'json'))
        return
      }
      console.log(formatConnectionsTable(connections))
    })

  connCmd
    .command('show <name-or-id>')
    .description('Show details for a specific connection')
    .option('--format <format>', 'output format: table or json', 'json')
    .action((nameOrId: string, opts: { format: string }) => {
      const conn = getConnection(nameOrId)
      if (!conn) {
        console.error(`Connection "${nameOrId}" not found.`)
        process.exit(1)
      }

      const safe = {
        id: conn.id,
        name: conn.name,
        type: conn.type,
        host: (conn.options as unknown as Record<string, unknown>).host,
        port: (conn.options as unknown as Record<string, unknown>).port,
        database: (conn.options as unknown as Record<string, unknown>).database,
        user: (conn.options as unknown as Record<string, unknown>).user,
        sslMode: (conn.options as unknown as Record<string, unknown>).sslMode ?? 'disable',
        createdAt: conn.createdAt,
        updatedAt: conn.updatedAt,
        lastConnectedAt: conn.lastConnectedAt
      }

      console.log(formatJson(safe))
    })

  connCmd
    .command('add')
    .description('Add a new database connection')
    .requiredOption('-n, --name <name>', 'connection name (e.g. "Production")')
    .requiredOption('--host <host>', 'database host', 'localhost')
    .option('-p, --port <port>', 'database port', '5432')
    .requiredOption('-d, --database <name>', 'database name')
    .requiredOption('-u, --user <user>', 'database user')
    .option('-w, --password <password>', 'database password')
    .option('--ssl-mode <mode>', 'SSL mode: disable, allow, prefer, require, verify-ca, verify-full', 'disable')
    .option('--format <format>', 'output format: json or table', 'json')
    .action(
      (opts: {
        name: string
        host: string
        port: string
        database: string
        user: string
        password?: string
        sslMode: string
        format: string
      }) => {
        try {
          const profile = addConnection({
            name: opts.name,
            host: opts.host,
            port: parseInt(opts.port, 10),
            database: opts.database,
            user: opts.user,
            password: opts.password,
            sslMode: opts.sslMode
          })

          console.log(
            formatJson({
              id: profile.id,
              name: profile.name,
              type: profile.type,
              host: opts.host,
              port: parseInt(opts.port, 10),
              database: opts.database,
              message: `Connection "${opts.name}" added successfully. Use "dbdesk connection list" to verify.`
            })
          )
        } catch (err) {
          console.error(String(err))
          process.exit(1)
        }
      }
    )

  connCmd
    .command('remove <name-or-id>')
    .description('Remove a database connection')
    .action((nameOrId: string) => {
      try {
        removeConnection(nameOrId)
        console.log(`Connection "${nameOrId}" removed.`)
      } catch (err) {
        console.error(String(err))
        process.exit(1)
      }
    })
}
