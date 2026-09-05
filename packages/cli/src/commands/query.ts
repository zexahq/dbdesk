import { readFileSync } from 'node:fs'
import { connectionRefOrEnv, resolveConnection, getSavedQuery } from '../lib/db-access'
import { getAdapter } from '../lib/adapter-pool'
import { runAction, warn } from '../lib/output'
import { CliError } from '../lib/errors'
import { isReadOnlyQuery } from '@dbdesk/shared/adapters'
import type { Command } from 'commander'

function readSql(opts: {
  query?: string
  file?: string
  saved?: string
  connection: string
}): string {
  if (opts.saved) {
    const saved = getSavedQuery(resolveConnection(opts.connection).id, opts.saved)
    if (!saved) {
      throw new CliError(
        'not-found',
        `Saved query "${opts.saved}" not found.`,
        'Use "dbdesk saved-query list" to see available queries.'
      )
    }
    return saved.content
  }
  if (opts.file) {
    return readFileSync(opts.file, 'utf-8').trim()
  }
  return (opts.query ?? '').trim()
}

export function registerQueryCommands(program: Command): void {
  program
    .command('query')
    .description('Execute a read-only SQL query (SELECT/SHOW only)')
    .argument('[sql]', 'SQL query to execute. Use --file or --saved instead.')
    .option('-c, --connection <name-or-id>', 'connection name or ID (or set DBDESK_CONNECTION)')
    .option('-f, --file <path>', 'read SQL from a file')
    .option('--saved <id-or-name>', 'run a saved query by ID or name')
    .option('-l, --limit <number>', 'max rows to return (default 100, 0 = no limit)', '100')
    .option('--offset <number>', 'rows to skip (for paging through results)', '0')
    .option('--format <format>', 'output format: table (default), json, or csv', 'table')
    .action(
      (
        sql: string | undefined,
        opts: {
          connection?: string
          file?: string
          saved?: string
          limit: string
          offset: string
          format: string
        }
      ) =>
        runAction(opts, ['table', 'json', 'csv'], async (format) => {
          const connection = connectionRefOrEnv(opts.connection)
          const queryText = readSql({ query: sql, file: opts.file, saved: opts.saved, connection })

          if (!queryText) {
            throw new CliError(
              'usage',
              'No SQL query provided.',
              'Pass SQL inline, --file <path>, or --saved <id-or-name>.'
            )
          }

          if (!isReadOnlyQuery(queryText)) {
            throw new CliError(
              'usage',
              'Only SELECT and SHOW queries are allowed via the CLI.',
              'Use the DBDesk desktop app for write operations.'
            )
          }

          const limit = parseInt(opts.limit, 10)
          const offset = parseInt(opts.offset, 10)
          if (Number.isNaN(limit) || limit < 0) {
            throw new CliError('usage', `Invalid limit "${opts.limit}". Use 0 for no limit.`)
          }
          if (Number.isNaN(offset) || offset < 0) {
            throw new CliError('usage', `Invalid offset "${opts.offset}".`)
          }
          if (limit === 0) {
            warn('No row limit set (limit 0). Large tables can produce very large output.')
          }

          const conn = resolveConnection(connection)
          const adapter = await getAdapter(conn)
          const result =
            limit === 0
              ? await adapter.runQuery(queryText, { readOnly: true })
              : await adapter.runQuery(queryText, {
                  limit,
                  offset,
                  includeTotalRowCount: true,
                  readOnly: true
                })

          if (format === 'json') {
            return {
              columns: result.columns,
              rowCount: result.rowCount,
              totalRowCount: result.totalRowCount ?? null,
              limit: result.limit ?? null,
              offset: result.offset ?? null,
              rows: result.rows
            }
          }
          if (result.totalRowCount !== undefined && result.totalRowCount > result.rows.length) {
            warn(
              `Showing ${result.rows.length} of ${result.totalRowCount} rows. Re-run with --offset to page.`
            )
          }
          return result.rows
        })
    )
}
