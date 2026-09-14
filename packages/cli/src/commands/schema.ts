import { connectionRefOrEnv, resolveConnection } from '../lib/db-access'
import { getAdapter } from '../lib/adapter-pool'
import { runAction } from '../lib/output'
import type { Command } from 'commander'

export function registerSchemaCommands(program: Command): void {
  const schemaCmd = program.command('schema').description('Explore database schemas')

  schemaCmd
    .command('list')
    .description('List all schemas in a database')
    .option('-c, --connection <name-or-id>', 'connection name or ID (or set DBDESK_CONNECTION)')
    .option('--format <format>', 'output format: table (default) or json', 'table')
    .action((opts: { connection?: string; format: string }) =>
      runAction(opts, ['table', 'json'], async () => {
        const conn = resolveConnection(connectionRefOrEnv(opts.connection))
        const adapter = await getAdapter(conn)
        return adapter.listSchemas()
      })
    )

  schemaCmd
    .command('tables')
    .description('List all tables in a schema')
    .option('-c, --connection <name-or-id>', 'connection name or ID (or set DBDESK_CONNECTION)')
    .requiredOption('-s, --schema <name>', 'schema name (e.g. public)')
    .option('--format <format>', 'output format: table (default) or json', 'table')
    .action((opts: { connection?: string; schema: string; format: string }) =>
      runAction(opts, ['table', 'json'], async () => {
        const conn = resolveConnection(connectionRefOrEnv(opts.connection))
        const adapter = await getAdapter(conn)
        return adapter.listTables(opts.schema)
      })
    )

  schemaCmd
    .command('info')
    .description('Show detailed info about a table (columns, types, keys, indexes)')
    .option('-c, --connection <name-or-id>', 'connection name or ID (or set DBDESK_CONNECTION)')
    .requiredOption('-s, --schema <name>', 'schema name (e.g. public)')
    .requiredOption('-t, --table <name>', 'table name')
    .option('--format <format>', 'output format: table (default) or json', 'table')
    .action((opts: { connection?: string; schema: string; table: string; format: string }) =>
      runAction(opts, ['table', 'json'], async () => {
        const conn = resolveConnection(connectionRefOrEnv(opts.connection))
        const adapter = await getAdapter(conn)
        const info = await adapter.introspectTable(opts.schema, opts.table)
        return {
          name: info.name,
          schema: info.schema,
          columns: info.columns.map((c) => ({
            name: c.name,
            type: c.type,
            nullable: c.nullable,
            isPrimaryKey: c.isPrimaryKey ?? false,
            defaultValue: c.defaultValue ?? null,
            enumValues: c.enumValues ?? null,
            foreignKey: c.foreignKey
              ? {
                  table: `${c.foreignKey.referencedSchema}.${c.foreignKey.referencedTable}`,
                  column: c.foreignKey.referencedColumn,
                  onDelete: c.foreignKey.onDelete,
                  onUpdate: c.foreignKey.onUpdate
                }
              : null
          })),
          constraints: info.constraints ?? [],
          indexes: info.indexes ?? []
        }
      })
    )

  schemaCmd
    .command('tree')
    .description('Show full database tree (schemas -> tables)')
    .option('-c, --connection <name-or-id>', 'connection name or ID (or set DBDESK_CONNECTION)')
    .option('--format <format>', 'output format: table (default) or json', 'table')
    .action((opts: { connection?: string; format: string }) =>
      runAction(opts, ['table', 'json'], async (format) => {
        const conn = resolveConnection(connectionRefOrEnv(opts.connection))
        const adapter = await getAdapter(conn)
        const schemas = await adapter.listSchemaWithTables()
        if (format === 'json') return schemas
        if (schemas.length === 0) return '(empty)'
        return schemas
          .map(
            (s) => `${s.schema}/ (${s.tables.length} tables)\n` + s.tables.map((t) => `  └─ ${t}`).join('\n')
          )
          .join('\n')
      })
    )
}
