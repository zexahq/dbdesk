import { resolveConnection } from '../lib/db-access'
import { getAdapter, disconnectAll } from '../lib/adapter-pool'
import { formatResult, formatSchemaTree, formatJson } from '../lib/format'
import type { Command } from 'commander'

export function registerSchemaCommands(program: Command): void {
  const schemaCmd = program.command('schema').description('Explore database schemas')

  schemaCmd
    .command('list')
    .description('List all schemas in a database')
    .requiredOption('-c, --connection <name-or-id>', 'connection name or ID')
    .option('--format <format>', 'output format: table or json', 'table')
    .action(async (opts: { connection: string; format: string }) => {
      try {
        const conn = resolveConnection(opts.connection)
        const adapter = await getAdapter(conn)
        const schemas = await adapter.listSchemas()
        console.log(formatResult(schemas, opts.format as 'table' | 'json'))
      } catch (err) {
        console.error(formatResult([], opts.format as 'table' | 'json'))
        console.error(String(err))
        process.exit(1)
      }
    })

  schemaCmd
    .command('tables')
    .description('List all tables in a schema')
    .requiredOption('-c, --connection <name-or-id>', 'connection name or ID')
    .requiredOption('-s, --schema <name>', 'schema name (e.g. public)')
    .option('--format <format>', 'output format: table or json', 'table')
    .action(async (opts: { connection: string; schema: string; format: string }) => {
      try {
        const conn = resolveConnection(opts.connection)
        const adapter = await getAdapter(conn)
        const tables = await adapter.listTables(opts.schema)
        console.log(formatResult(tables, opts.format as 'table' | 'json'))
      } catch (err) {
        console.error(String(err))
        process.exit(1)
      }
    })

  schemaCmd
    .command('info')
    .description('Show detailed info about a table (columns, types, keys, indexes)')
    .requiredOption('-c, --connection <name-or-id>', 'connection name or ID')
    .requiredOption('-s, --schema <name>', 'schema name (e.g. public)')
    .requiredOption('-t, --table <name>', 'table name')
    .option('--format <format>', 'output format: json (recommended) or table', 'json')
    .action(
      async (opts: {
        connection: string
        schema: string
        table: string
        format: string
      }) => {
        try {
          const conn = resolveConnection(opts.connection)
          const adapter = await getAdapter(conn)
          const info = await adapter.introspectTable(opts.schema, opts.table)

          const output = {
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

          console.log(formatJson(output))
        } catch (err) {
          console.error(String(err))
          process.exit(1)
        }
      }
    )

  schemaCmd
    .command('tree')
    .description('Show full database tree (schemas -> tables -> column count)')
    .requiredOption('-c, --connection <name-or-id>', 'connection name or ID')
    .option('--format <format>', 'output format: table or json', 'table')
    .action(async (opts: { connection: string; format: string }) => {
      try {
        const conn = resolveConnection(opts.connection)
        const adapter = await getAdapter(conn)
        const schemas = await adapter.listSchemaWithTables()
        if (opts.format === 'json') {
          console.log(formatJson(schemas))
        } else {
          console.log(formatSchemaTree(schemas))
        }
      } catch (err) {
        console.error(String(err))
        process.exit(1)
      }
    })
}
