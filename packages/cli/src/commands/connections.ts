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
    createdAt: conn.createdAt,
    updatedAt: conn.updatedAt,
    lastConnectedAt: conn.lastConnectedAt ?? null
  }
}

function readPasswordStdin(): Promise<string> {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      resolve('')
      return
    }
    let data = ''
    process.stdin.setEncoding('utf-8')
    process.stdin.on('data', (chunk: string) => {
      data += chunk
    })
    process.stdin.on('end', () => resolve(data.trim()))
  })
}

async function promptPassword(): Promise<string> {
  if (!process.stdin.isTTY) return ''
  return promptPasswordHidden('Password (empty for none): ')
}

/**
 * TTY password prompt with terminal echo disabled, so the credential never
 * lands in scrollback or session recordings. Restores the terminal on
 * completion, Ctrl+C, or interruption.
 */
function promptPasswordHidden(query: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin
    process.stdout.write(query)
    stdin.setEncoding('utf8')
    stdin.resume()

    let password = ''
    let settled = false
    const wasRaw = stdin.isRaw
    if (stdin.isTTY) stdin.setRawMode(true)

    const cleanup = () => {
      stdin.removeListener('data', onData)
      stdin.removeListener('end', onEnd)
      if (stdin.isTTY) stdin.setRawMode(!!wasRaw)
      stdin.pause()
    }
    const done = (fn: () => void) => {
      if (settled) return
      settled = true
      cleanup()
      process.stdout.write('\n')
      fn()
    }
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === '\n' || ch === '\r' || ch === '\u0004') {
          done(() => resolve(password.trim()))
          return
        }
        if (ch === '\u0003') {
          done(() => reject(new CliError('cancelled', 'Cancelled. No connection was saved.')))
          return
        }
        if (ch === '\u007f' || ch === '\b') {
          password = password.slice(0, -1)
        } else {
          password += ch
        }
      }
    }
    const onEnd = () => {
      done(() => resolve(password.trim()))
    }
    stdin.on('data', onData)
    stdin.on('end', onEnd)
  })
}

async function resolvePassword(opts: {
  password?: string
  passwordStdin?: boolean
}): Promise<string> {
  if (opts.password !== undefined) return opts.password
  if (opts.passwordStdin) return readPasswordStdin()
  const env = process.env.DBDESK_PASSWORD
  if (env !== undefined) return env
  return promptPassword()
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
    .description('Add a new Postgres connection')
    .requiredOption('-n, --name <name>', 'connection name (e.g. "Production")')
    .requiredOption('--host <host>', 'database host', 'localhost')
    .option('-p, --port <port>', 'database port', '5432')
    .requiredOption('-d, --database <name>', 'database name')
    .requiredOption('-u, --user <user>', 'database user')
    .option(
      '-w, --password <password>',
      'database password (prefer DBDESK_PASSWORD env or --password-stdin)'
    )
    .option('--password-stdin', 'read the password from stdin')
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
        password?: string
        passwordStdin?: boolean
        sslMode: string
        format: string
      }) =>
        runAction(opts, ['table', 'json'], async () => {
          const port = parseInt(opts.port, 10)
          if (Number.isNaN(port) || port <= 0 || port > 65535) {
            throw new CliError('usage', `Invalid port "${opts.port}".`)
          }
          const password = await resolvePassword(opts)
          const profile = addConnection({
            name: opts.name,
            host: opts.host,
            port,
            database: opts.database,
            user: opts.user,
            password,
            sslMode: opts.sslMode
          })
          return {
            id: profile.id,
            name: profile.name,
            type: profile.type,
            message: `Connection "${opts.name}" added. Verify with "dbdesk connection test ${opts.name}".`
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
        const adapter = await getAdapter(conn).catch((err: unknown) => {
          throw new CliError(
            'connection-failed',
            `Could not connect to "${conn.name}": ${err instanceof Error ? err.message : String(err)}`,
            'Check host/port/database/user and that the server accepts remote connections.'
          )
        })
        const start = Date.now()
        try {
          await adapter.runQuery('SELECT 1')
        } finally {
          await disconnectAll().catch(() => {})
        }
        return { name: conn.name, reachable: true, latency_ms: Date.now() - start }
      })
    )
}
