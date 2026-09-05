import { connectionRefOrEnv, resolveConnection } from '../lib/db-access'
import { getAdapter } from '../lib/adapter-pool'
import { runAction, warn } from '../lib/output'
import { CliError } from '../lib/errors'
import type { Command } from 'commander'

export function registerTableCommands(program: Command): void {
  const tableCmd = program.command('table').description('Browse table data')

  tableCmd
    .command('rows')
    .description('Fetch rows from a table (read-only)')
    .option('-c, --connection <name-or-id>', 'connection name or ID (or set DBDESK_CONNECTION)')
    .requiredOption('-s, --schema <name>', 'schema name (e.g. public)')
    .requiredOption('-t, --table <name>', 'table name')
    .option('-l, --limit <number>', 'max rows to return (default 100, 0 = no limit)', '100')
    .option('--offset <number>', 'rows to skip (for paging through results)', '0')
    .option('--format <format>', 'output format: table (default), json, or csv', 'table')
    .action(
      (opts: {
        connection?: string
        schema: string
        table: string
        limit: string
        offset: string
        format: string
      }) =>
        runAction(opts, ['table', 'json', 'csv'], async (format) => {
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

          const conn = resolveConnection(connectionRefOrEnv(opts.connection))
          const adapter = await getAdapter(conn)
          const result = await adapter.fetchTableData({
            schema: opts.schema,
            table: opts.table,
            limit: limit === 0 ? undefined : limit,
            offset
          })

          if (format === 'json') {
            return {
              schema: opts.schema,
              table: opts.table,
              columns: result.columns,
              rowCount: result.rowCount,
              totalCount: result.totalCount,
              rows: result.rows
            }
          }
          if (result.totalCount > result.rows.length) {
            warn(
              `Showing ${result.rows.length} of ${result.totalCount} rows. Re-run with --offset to page.`
            )
          }
          return result.rows
        })
    )
}
