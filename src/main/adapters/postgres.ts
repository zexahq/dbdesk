import { performance } from 'node:perf_hooks'
import type { QueryResult, SQLAdapter, SQLConnectionOptions, TableInfo } from '@common/types'
import { Pool, type QueryResult as PgQueryResult } from 'pg'

import type { QueryResultRow } from '@common/types/adapter'

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
        await client.query('SELECT 1')
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

    const result = await pool.query<{ schema_name: string }>(
      `
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
      ORDER BY schema_name
    `
    )

    return result.rows.map((row) => row.schema_name)
  }

  public async listTables(schema: string): Promise<string[]> {
    const pool = this.ensurePool()

    const result = await pool.query<{ table_name: string }>(
      `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = $1
      ORDER BY table_name
    `,
      [schema]
    )

    return result.rows.map((row) => row.table_name)
  }

  public async introspectTable(schema: string, table: string): Promise<TableInfo> {
    const pool = this.ensurePool()

    const [columns, constraints, indexes] = await Promise.all([
      this.queryColumns(pool, schema, table),
      this.queryConstraints(pool, schema, table),
      this.queryIndexes(pool, schema, table)
    ])

    console.log('columns', columns)
    console.log('constraints', constraints)
    console.log('indexes', indexes)

    return {
      name: table,
      schema,
      columns,
      constraints: constraints.length > 0 ? constraints : undefined,
      indexes: indexes && indexes.length > 0 ? indexes : undefined
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
    }>(
      `
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = $1
        AND table_name = $2
      ORDER BY ordinal_position
    `,
      [schema, table]
    )

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
    }>(
      `
      SELECT
        tc.constraint_name,
        tc.constraint_type,
        array_agg(kcu.column_name ORDER BY kcu.ordinal_position) FILTER (WHERE kcu.column_name IS NOT NULL) AS columns,
        ccu.table_schema AS foreign_table_schema,
        ccu.table_name AS foreign_table_name,
        array_agg(ccu.column_name) FILTER (WHERE ccu.column_name IS NOT NULL) AS foreign_columns
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
        AND tc.table_name = kcu.table_name
      LEFT JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
        AND tc.table_schema = ccu.table_schema
      WHERE tc.table_schema = $1
        AND tc.table_name = $2
      GROUP BY
        tc.constraint_name, tc.constraint_type, ccu.table_schema, ccu.table_name
      ORDER BY tc.constraint_name
    `,
      [schema, table]
    )

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
    }>(
      `
      SELECT
        idx.relname AS index_name,
        array_agg(att.attname ORDER BY ord.ordinality) AS column_names,
        i.indisunique AS is_unique
      FROM pg_class AS tbl
      JOIN pg_namespace AS ns ON ns.oid = tbl.relnamespace
      JOIN pg_index AS i ON i.indrelid = tbl.oid
      JOIN pg_class AS idx ON idx.oid = i.indexrelid
      JOIN LATERAL unnest(i.indkey) WITH ORDINALITY AS ord(attnum, ordinality) ON true
      JOIN pg_attribute AS att ON att.attrelid = tbl.oid AND att.attnum = ord.attnum
      WHERE ns.nspname = $1
        AND tbl.relname = $2
      GROUP BY idx.relname, i.indisunique
      ORDER BY idx.relname
    `,
      [schema, table]
    )

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
