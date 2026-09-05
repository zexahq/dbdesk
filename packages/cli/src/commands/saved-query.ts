import { readFileSync } from 'node:fs'
import {
  connectionRefOrEnv,
  resolveConnection,
  listSavedQueries,
  getSavedQuery,
  saveSavedQuery,
  removeSavedQuery
} from '../lib/db-access'
import { getAdapter } from '../lib/adapter-pool'
import { runAction } from '../lib/output'
import { CliError } from '../lib/errors'
import { isReadOnlyQuery } from '@dbdesk/shared/adapters'
import type { Command } from 'commander'

export function registerSavedQueryCommands(program: Command): void {
  const sqCmd = program.command('saved-query').description('Manage reusable saved queries')

  sqCmd
    .command('list')
    .description('List saved queries for a connection')
    .option('-c, --connection <name-or-id>', 'connection name or ID (or set DBDESK_CONNECTION)')
    .option('--format <format>', 'output format: table (default) or json', 'table')
    .action((opts: { connection?: string; format: string }) =>
      runAction(opts, ['table', 'json'], () => {
        const connectionId = resolveConnection(connectionRefOrEnv(opts.connection)).id
        return listSavedQueries(connectionId)
      })
    )

  sqCmd
    .command('show <id-or-name>')
    .description('Show a saved query')
    .option('-c, --connection <name-or-id>', 'connection name or ID (or set DBDESK_CONNECTION)')
    .option('--format <format>', 'output format: table (default) or json', 'table')
    .action((idOrName: string, opts: { connection?: string; format: string }) =>
      runAction(opts, ['table', 'json'], () => {
        const connectionId = resolveConnection(connectionRefOrEnv(opts.connection)).id
        const saved = getSavedQuery(connectionId, idOrName)
        if (!saved) {
          throw new CliError(
            'not-found',
            `Saved query "${idOrName}" not found.`,
            'Use "dbdesk saved-query list" to see available queries.'
          )
        }
        return saved
      })
    )

  sqCmd
    .command('save')
    .description('Save a query for reuse (upserts by name)')
    .option('-c, --connection <name-or-id>', 'connection name or ID (or set DBDESK_CONNECTION)')
    .requiredOption('-n, --name <name>', 'query name')
    .option('--query <sql>', 'SQL text (SELECT/SHOW only)')
    .option('-f, --file <path>', 'read SQL from a file')
    .option('--format <format>', 'output format: table (default) or json', 'table')
    .action(
      (opts: {
        connection?: string
        name: string
        query?: string
        file?: string
        format: string
      }) =>
        runAction(opts, ['table', 'json'], () => {
          const content = opts.file
            ? readFileSync(opts.file, 'utf-8').trim()
            : (opts.query ?? '').trim()
          if (!content) {
            throw new CliError('usage', 'No SQL provided.', 'Pass --query <sql> or --file <path>.')
          }
          if (!isReadOnlyQuery(content)) {
            throw new CliError(
              'usage',
              'Only SELECT and SHOW queries can be saved.',
              'Use the DBDesk desktop app for write operations.'
            )
          }
          const connectionId = resolveConnection(connectionRefOrEnv(opts.connection)).id
          return saveSavedQuery(connectionId, opts.name, content)
        })
    )

  sqCmd
    .command('run <id-or-name>')
    .description('Run a saved query (read-only)')
    .option('-c, --connection <name-or-id>', 'connection name or ID (or set DBDESK_CONNECTION)')
    .option('-l, --limit <number>', 'max rows to return (default 100, 0 = no limit)', '100')
    .option('--format <format>', 'output format: table (default), json, or csv', 'table')
    .action((idOrName: string, opts: { connection?: string; limit: string; format: string }) =>
      runAction(opts, ['table', 'json', 'csv'], async (format) => {
        const limit = parseInt(opts.limit, 10)
        if (Number.isNaN(limit) || limit < 0) {
          throw new CliError('usage', `Invalid limit "${opts.limit}". Use 0 for no limit.`)
        }
        const conn = resolveConnection(connectionRefOrEnv(opts.connection))
        const saved = getSavedQuery(conn.id, idOrName)
        if (!saved) {
          throw new CliError(
            'not-found',
            `Saved query "${idOrName}" not found.`,
            'Use "dbdesk saved-query list" to see available queries.'
          )
        }
        // Revalidate stored SQL on every run: saved queries share storage
        // with the desktop app, which can store non-read-only statements.
        if (!isReadOnlyQuery(saved.content)) {
          throw new CliError(
            'usage',
            `Saved query "${saved.name}" is not read-only and cannot run via the CLI.`,
            'Run it from the DBDesk desktop app instead.'
          )
        }
        const adapter = await getAdapter(conn)
        const result =
          limit === 0
            ? await adapter.runQuery(saved.content, { readOnly: true })
            : await adapter.runQuery(saved.content, {
                limit,
                includeTotalRowCount: true,
                readOnly: true
              })
        if (format === 'json') {
          return {
            name: saved.name,
            columns: result.columns,
            rowCount: result.rowCount,
            rows: result.rows
          }
        }
        return result.rows
      })
    )

  sqCmd
    .command('remove <id-or-name>')
    .description('Delete a saved query')
    .option('-c, --connection <name-or-id>', 'connection name or ID (or set DBDESK_CONNECTION)')
    .option('--format <format>', 'output format: table (default) or json', 'table')
    .action((idOrName: string, opts: { connection?: string; format: string }) =>
      runAction(opts, ['table', 'json'], () => {
        const connectionId = resolveConnection(connectionRefOrEnv(opts.connection)).id
        if (!removeSavedQuery(connectionId, idOrName)) {
          throw new CliError('not-found', `Saved query "${idOrName}" not found.`)
        }
        return { removed: idOrName, message: `Saved query "${idOrName}" removed.` }
      })
    )
}
