import { performance } from 'node:perf_hooks'
import type { QueryResult, SQLAdapter, SQLConnectionOptions, TableInfo } from '@common/types'
import { Pool, type QueryResult as PgQueryResult } from 'pg'

import type { QueryResultRow } from '@common/types/adapter'
import type { TableDataOptions, TableDataResult } from '@common/types/sql'
import { QUERIES, buildTableDataQuery, buildTableCountQuery } from '../lib/postgers/queries'

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

    // Build and execute the data query
    const { query, params } = buildTableDataQuery(options)
    const dataResult = await pool.query<QueryResultRow>(query, params)

    // Build and execute the count query
    const { query: countQuery, params: countParams } = buildTableCountQuery(options)
    const countResult = await pool.query<{ total: number }>(countQuery, countParams)

    const executionTime = performance.now() - start
    const columns = dataResult.fields.map((field) => field.name)
    const totalCount = countResult.rows[0]?.total ?? 0

    return {
      rows: dataResult.rows,
      columns,
      totalCount,
      rowCount: dataResult.rows.length,
      executionTime
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
    }>(QUERIES.LIST_COLUMNS, [schema, table])

    return result.rows.map((row) => ({
      name: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable === 'YES',
      defaultValue: row.column_default ?? undefined
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
