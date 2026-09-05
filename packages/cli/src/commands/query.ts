import { readFileSync } from 'node:fs'
import { resolveConnection } from '../lib/db-access'
import { getAdapter, disconnectAll } from '../lib/adapter-pool'
import { formatResult, errorResult } from '../lib/format'
import { isReadOnlyQuery } from '@dbdesk/shared/adapters'
import type { Command } from 'commander'

export function registerQueryCommands(program: Command): void {
  program
    .command('query')
    .description('Execute a read-only SQL query')
    .argument('[sql]', 'SQL query to execute. Use --file to read from a file instead.')
    .requiredOption('-c, --connection <name-or-id>', 'connection name or ID')
    .option('-f, --file <path>', 'read SQL from a file')
    .option('-l, --limit <number>', 'max rows to return', '100')
    .option('--format <format>', 'output format: table, json, or csv', 'table')
    .action(
      async (
        sql: string | undefined,
        opts: {
          connection: string
          file?: string
          limit: string
          format: string
        }
      ) => {
        try {
          const queryText = opts.file ? readFileSync(opts.file, 'utf-8').trim() : sql

          if (!queryText) {
            console.error(errorResult('No SQL query provided.', opts.format as 'table' | 'json'))
            process.exit(1)
          }

          if (!isReadOnlyQuery(queryText)) {
            console.error(
              errorResult(
                'Only SELECT and SHOW queries are allowed via the CLI. Use the DBDesk desktop app for write operations.',
                opts.format as 'table' | 'json'
              )
            )
            process.exit(1)
          }

          const conn = resolveConnection(opts.connection)
          const adapter = await getAdapter(conn)
          const limit = parseInt(opts.limit, 10)

          const result = await adapter.runQuery(queryText, { limit })

          if (opts.format === 'json') {
            console.log(
              JSON.stringify(
                { ok: true, columns: result.columns, rowCount: result.rowCount, totalRowCount: result.totalRowCount, rows: result.rows },
                null,
                2
              )
            )
          } else {
            console.log(formatResult(result.rows, opts.format as 'table' | 'json'))
            if (result.totalRowCount !== undefined && result.totalRowCount > result.rows.length) {
              console.log(`\nShowing ${result.rows.length} of ${result.totalRowCount} rows (limit: ${limit}).`)
            }
          }
        } catch (err) {
          console.error(String(err))
          process.exit(1)
        }
      }
    )
}
