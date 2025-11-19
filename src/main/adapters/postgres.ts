import type {
  DeleteTableRowsOptions,
  DeleteTableRowsResult,
  QueryResult,
  SQLAdapter,
  SQLConnectionOptions,
  TableInfo
} from '@common/types'
import { performance } from 'node:perf_hooks'
import { Pool, type QueryResult as PgQueryResult } from 'pg'

import type { SchemaWithTables, TableDataOptions, TableDataResult } from '@common/types/sql'
import type { QueryResultRow } from 'pg'
import { QUERIES, buildTableCountQuery, buildTableDataQuery } from '../lib/postgers/queries'
import { quoteIdentifier } from '../lib/postgers/utils'

const DEFAULT_TIMEOUT_MS = 30_000

export class PostgresAdapter implements SQLAdapter {
  private pool: Pool | null = null

  constructor(private readonly options: SQLConnectionOptions) {}

  public async connect(): Promise<void> {
    if (this.pool) {
      return
    }

    const pool = new Pool({
      host: this.options.host,
      port: this.options.port,
      database: this.options.database,
      user: this.options.user,
      password: this.options.password,
      ssl: this.options.ssl,
      max: 10,
      idleTimeoutMillis: DEFAULT_TIMEOUT_MS,
      connectionTimeoutMillis: DEFAULT_TIMEOUT_MS
    })

    try {
      const client = await pool.connect()
      try {
        await client.query(QUERIES.TEST_CONNECTION)
      } finally {
        client.release()
      }

      this.pool = pool
    } catch (error) {
      await pool.end().catch(() => {})
      throw error
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.pool) {
      return
    }

    await this.pool.end()
    this.pool = null
  }

  public async runQuery(query: string): Promise<QueryResult> {
    const pool = this.ensurePool()
    const start = performance.now()

    const result = await pool.query(query)

    const executionTime = performance.now() - start

    return this.transformResult(result, executionTime)
  }

  public async listSchemas(): Promise<string[]> {
    const pool = this.ensurePool()

    const result = await pool.query<{ schema_name: string }>(QUERIES.LIST_SCHEMAS)

    return result.rows.map((row) => row.schema_name)
  }

  public async listTables(schema: string): Promise<string[]> {
    const pool = this.ensurePool()

    const result = await pool.query<{ table_name: string }>(QUERIES.LIST_TABLES, [schema])

    return result.rows.map((row) => row.table_name)
  }

  public async listSchemaWithTables(): Promise<SchemaWithTables[]> {
    const pool = this.ensurePool()

    const result = await pool.query<{ schema_name: string; tables: string }>(
      QUERIES.LIST_SCHEMAS_WITH_TABLES
    )

    return result.rows.map((row) => {
      let tables: string[] = []
      if (row.tables && row.tables !== '{}') {
        const arrayContent = row.tables.slice(1, -1) // Remove '{' and '}'
        if (arrayContent.trim()) {
          tables = arrayContent.split(',').map((t) => t.trim())
        }
      }
      return {
        schema: row.schema_name,
        tables
      }
    })
  }

  public async introspectTable(schema: string, table: string): Promise<TableInfo> {
    const pool = this.ensurePool()

    const [columns, constraints, indexes] = await Promise.all([
      this.queryColumns(pool, schema, table),
      this.queryConstraints(pool, schema, table),
      this.queryIndexes(pool, schema, table)
    ])

    return {
      name: table,
      schema,
      columns,
      constraints: constraints.length > 0 ? constraints : undefined,
      indexes: indexes && indexes.length > 0 ? indexes : undefined
    }
  }

  public async fetchTableData(options: TableDataOptions): Promise<TableDataResult> {
    const pool = this.ensurePool()
    const start = performance.now()

    // Build queries
    const { query, params } = buildTableDataQuery(options)
    const { query: countQuery, params: countParams } = buildTableCountQuery(options)

    // Execute data, count, and column metadata queries in parallel
    const [dataResult, countResult, columnInfo] = await Promise.all([
      pool.query<QueryResultRow>(query, params),
      pool.query<{ total: number }>(countQuery, countParams),
      this.queryColumns(pool, options.schema, options.table)
    ])

    const executionTime = performance.now() - start
    const columns = columnInfo.map((column) => ({
      name: column.name,
      dataType: column.type,
      isPrimaryKey: column.isPrimaryKey ?? false
    }))
    const primaryKeyColumns = columnInfo.filter((column) => column.isPrimaryKey).map((c) => c.name)
    const totalCount = countResult.rows[0]?.total ?? 0

    return {
      rows: dataResult.rows,
      columns,
      totalCount,
      rowCount: dataResult.rows.length,
      executionTime,
      primaryKeyColumns
    }
  }

  public async deleteTableRows(options: DeleteTableRowsOptions): Promise<DeleteTableRowsResult> {
    const pool = this.ensurePool()
    const { schema, table, rows } = options

    if (!rows || rows.length === 0) {
      return { deletedRowCount: 0 }
    }

    const columns = await this.queryColumns(pool, schema, table)
    const primaryKeyColumns = columns
      .filter((column) => column.isPrimaryKey)
      .map((column) => column.name)

    if (primaryKeyColumns.length === 0) {
      throw new Error(
        `Table "${schema}.${table}" does not have a primary key. Add a primary key to delete rows safely.`
      )
    }

    const client = await pool.connect()

    try {
      await client.query('BEGIN')
      let deletedRowCount = 0

      for (const row of rows) {
        const values = primaryKeyColumns.map((column) => {
          if (!(column in row)) {
            throw new Error(`Selected row is missing value for primary key column "${column}".`)
          }
          const value = row[column as keyof typeof row]
          if (value === undefined) {
            throw new Error(`Primary key column "${column}" is undefined for the selected row.`)
          }
          return value
        })

        const whereClause = primaryKeyColumns
          .map((column, index) => `${quoteIdentifier(column)} = $${index + 1}`)
          .join(' AND ')

        const query = `DELETE FROM ${quoteIdentifier(schema)}.${quoteIdentifier(table)} WHERE ${whereClause}`
        const result = await client.query(query, values)
        deletedRowCount += result.rowCount ?? 0
      }

      await client.query('COMMIT')

      return { deletedRowCount }
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {})
      throw error
    } finally {
      client.release()
    }
  }

  private ensurePool(): Pool {
    if (!this.pool) {
      throw new Error('Postgres adapter is not connected')
    }

    return this.pool
  }

  private transformResult(
    result: PgQueryResult<QueryResultRow>,
    executionTime: number
  ): QueryResult {
    const columns = result.fields.map((field) => field.name)

    return {
      rows: result.rows,
      columns,
      rowCount: typeof result.rowCount === 'number' ? result.rowCount : result.rows.length,
      executionTime
    }
  }

  private async queryColumns(pool: Pool, schema: string, table: string) {
    const result = await pool.query<{
      column_name: string
      data_type: string
      is_nullable: 'YES' | 'NO'
      column_default: unknown
      is_primary_key: boolean
    }>(QUERIES.LIST_COLUMNS, [schema, table])

    return result.rows.map((row) => ({
      name: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable === 'YES',
      defaultValue: row.column_default ?? undefined,
      isPrimaryKey: row.is_primary_key
    }))
  }

  private async queryConstraints(pool: Pool, schema: string, table: string) {
    const result = await pool.query<{
      constraint_name: string
      constraint_type: string
      columns: string[] | null
      foreign_table_schema: string | null
      foreign_table_name: string | null
      foreign_columns: string[] | null
    }>(QUERIES.LIST_CONSTRAINTS, [schema, table])

    return result.rows.map((row) => ({
      name: row.constraint_name,
      type: row.constraint_type,
      columns: row.columns ?? [],
      foreignTable:
        row.foreign_table_name && row.foreign_table_schema
          ? { schema: row.foreign_table_schema, name: row.foreign_table_name }
          : undefined,
      foreignColumns: row.foreign_columns ?? undefined
    }))
  }

  private async queryIndexes(
    pool: Pool,
    schema: string,
    table: string
  ): Promise<TableInfo['indexes']> {
    const result = await pool.query<{
      index_name: string
      column_names: string[]
      is_unique: boolean
    }>(QUERIES.LIST_INDEXES, [schema, table])

    return result.rows.map((row) => ({
      name: row.index_name,
      columns: row.column_names,
      unique: row.is_unique
    }))
  }
}

export const createPostgresAdapter = (options: SQLConnectionOptions): PostgresAdapter => {
  return new PostgresAdapter(options)
}
