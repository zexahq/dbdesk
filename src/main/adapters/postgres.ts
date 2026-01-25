import type {
  CreateTableOptions,
  CreateTableResult,
  DeleteTableOptions,
  DeleteTableResult,
  DeleteTableRowsOptions,
  DeleteTableRowsResult,
  InsertTableRowOptions,
  InsertTableRowResult,
  QueryResult,
  RunQueryOptions,
  SQLAdapter,
  SQLConnectionOptions,
  TableInfo,
  UpdateTableCellOptions,
  UpdateTableCellResult
} from '@common/types'
import type { PostgreSQLSslMode } from '@common/types/sql'
import { performance } from 'node:perf_hooks'
import { Pool, type QueryResult as PgQueryResult } from 'pg'

import type {
  ExportTableOptions,
  ExportTableResult,
  SchemaWithTables,
  TableDataOptions,
  TableDataResult
} from '@common/types/sql'
import type { QueryResultRow } from 'pg'
import {
  QUERIES,
  buildCreateTableQuery,
  buildTableCountQuery,
  buildTableDataQuery,
  buildUpdateCellQuery
} from '../lib/postgres/queries'
import { parsePostgresArray, quoteIdentifier } from '../lib/postgres/utils'
import { isSelectableQuery, normalizeQuery } from '../lib/sql-parser'

const DEFAULT_TIMEOUT_MS = 30_000

/**
 * Convert PostgreSQL SSL mode to pg client SSL configuration
 */
function getSslConfig(sslMode?: PostgreSQLSslMode): boolean | object {
  switch (sslMode) {
    case 'disable':
      return false
    case 'allow':
      return false
    case 'prefer':
      return { rejectUnauthorized: false }
    case 'require':
      return { rejectUnauthorized: false }
    case 'verify-ca':
      return true
    case 'verify-full':
      return true
    default:
      return false
  }
}

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
      ssl: getSslConfig(this.options.sslMode),
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

  public async runQuery(query: string, options?: RunQueryOptions): Promise<QueryResult> {
    const pool = this.ensurePool()
    const start = performance.now()

    const normalizedQuery = normalizeQuery(query)

    // Check if this is a SELECT query that can be paginated
    if (options && isSelectableQuery(normalizedQuery)) {
      // Execute count query and paginated query in parallel
      const countQuery = `SELECT COUNT(*) AS total FROM (${normalizedQuery}) AS subquery`
      const paginatedQuery = `SELECT * FROM (${normalizedQuery}) AS subquery LIMIT ${options.limit ?? 50} OFFSET ${options.offset ?? 0}`

      const [countResult, pageResult] = await Promise.all([
        pool.query<{ total: number }>(countQuery),
        pool.query<QueryResultRow>(paginatedQuery)
      ])

      const executionTime = performance.now() - start
      const totalRow = countResult.rows[0]?.total
      const totalRowCount = typeof totalRow === 'number' ? totalRow : Number(totalRow ?? 0)

      const transformedResult = this.transformResult(pageResult, executionTime)
      return {
        ...transformedResult,
        totalRowCount,
        limit: options.limit,
        offset: options.offset
      }
    }

    // For non-SELECT queries or when no pagination options provided
    const result = await pool.query(normalizedQuery)
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

    return result.rows.map((row) => ({
      schema: row.schema_name,
      tables: parsePostgresArray(row.tables)
    }))
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

    // If no sort rules provided, fetch columns first to get primary keys for default sorting
    if (!options.sortRules || options.sortRules.length === 0) {
      const columnInfo = await this.queryColumns(pool, options.schema, options.table)
      const primaryKeyColumns = columnInfo.filter((col) => col.isPrimaryKey).map((col) => col.name)

      // Add primary key sorting as default
      if (primaryKeyColumns.length > 0) {
        options.sortRules = primaryKeyColumns.map((column) => ({
          column,
          direction: 'ASC'
        }))
      }
    }

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
      isPrimaryKey: column.isPrimaryKey ?? false,
      enumValues: column.enumValues,
      foreignKey: column.foreignKey
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

  public async updateTableCell(options: UpdateTableCellOptions): Promise<UpdateTableCellResult> {
    const pool = this.ensurePool()
    const { schema, table, columnToUpdate, newValue, row } = options

    // Get column metadata to find primary keys
    const columns = await this.queryColumns(pool, schema, table)
    const primaryKeyColumns = columns
      .filter((column) => column.isPrimaryKey)
      .map((column) => column.name)

    if (primaryKeyColumns.length === 0) {
      throw new Error(
        `Table "${schema}.${table}" does not have a primary key. Add a primary key to update rows safely.`
      )
    }

    // Extract primary key values from the row
    const primaryKeyValues: Record<string, unknown> = {}
    for (const pkColumn of primaryKeyColumns) {
      if (!(pkColumn in row)) {
        throw new Error(`Row is missing value for primary key column "${pkColumn}".`)
      }
      const value = row[pkColumn as keyof typeof row]
      if (value === undefined) {
        throw new Error(`Primary key column "${pkColumn}" is undefined for the row.`)
      }
      primaryKeyValues[pkColumn] = value
    }

    // Build the UPDATE query
    const { query, params } = buildUpdateCellQuery({
      schema,
      table,
      columnToUpdate,
      newValue,
      primaryKeyColumns,
      primaryKeyValues
    })

    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const result = await client.query(query, params)

      await client.query('COMMIT')

      return {
        updatedRowCount: result.rowCount ?? 0
      }
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {})
      throw error
    } finally {
      client.release()
    }
  }

  public async insertTableRow(options: InsertTableRowOptions): Promise<InsertTableRowResult> {
    const pool = this.ensurePool()
    const { schema, table, values } = options

    // Filter out undefined values and prepare data
    const cleanedValues = Object.entries(values).filter(([, value]) => value !== undefined) as [
      string,
      unknown
    ][]

    if (cleanedValues.length === 0) {
      throw new Error('No values provided for insert')
    }

    const columns = cleanedValues.map(([col]) => `"${col}"`)
    const placeholders = cleanedValues.map((_, i) => `$${i + 1}`)
    const params = cleanedValues.map(([, value]) => value)

    const query = `
      INSERT INTO "${schema}"."${table}" (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
    `

    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const result = await client.query(query, params)

      await client.query('COMMIT')

      return {
        insertedRowCount: result.rowCount ?? 0
      }
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {})
      throw error
    } finally {
      client.release()
    }
  }

  public async exportTableAsCSV(options: ExportTableOptions): Promise<ExportTableResult> {
    const pool = this.ensurePool()
    const { schema, table } = options

    // Get column information first
    const columnInfo = await this.queryColumns(pool, schema, table)

    // Build the data query with all rows (no limit for export)
    const dataOptions: TableDataOptions = {
      ...options,
      limit: undefined, // No limit for export
      offset: undefined
    }

    const { query, params } = buildTableDataQuery(dataOptions)
    const result = await pool.query(query, params)

    // Serialize CSV
    const serializeCsvValue = (value: unknown): string => {
      if (value === null || value === undefined) return ''
      const str = String(value)
      const escaped = str.replace(/"/g, '""')
      return `"${escaped}"`
    }

    // Create header
    const header = columnInfo.map((col) => `"${col.name.replace(/"/g, '""')}"`).join(',')

    // Create data rows
    const lines = result.rows.map((row) => {
      const record = row as Record<string, unknown>
      return columnInfo.map((col) => serializeCsvValue(record[col.name])).join(',')
    })

    const csv = [header, ...lines].join('\n')
    const base64Content = Buffer.from(csv, 'utf-8').toString('base64')
    const filename = `${schema}.${table}.csv`

    return {
      base64Content,
      filename,
      mimeType: 'text/csv'
    }
  }

  public async exportTableAsSQL(options: ExportTableOptions): Promise<ExportTableResult> {
    const pool = this.ensurePool()
    const { schema, table } = options

    // Get column information first
    const columnInfo = await this.queryColumns(pool, schema, table)

    // Build the data query with all rows (no limit for export)
    const dataOptions: TableDataOptions = {
      ...options,
      limit: undefined, // No limit for export
      offset: undefined
    }

    const { query, params } = buildTableDataQuery(dataOptions)
    const result = await pool.query(query, params)

    // Serialize SQL
    const serializeSqlValue = (value: unknown): string => {
      if (value === null || value === undefined) return 'NULL'
      if (typeof value === 'number' || typeof value === 'bigint') return String(value)
      if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
      const str = String(value).replace(/'/g, "''")
      return `'${str}'`
    }

    const columnList = columnInfo.map((col) => quoteIdentifier(col.name)).join(', ')

    const statements = result.rows.map((row) => {
      const record = row as Record<string, unknown>
      const values = columnInfo.map((col) => serializeSqlValue(record[col.name])).join(', ')
      return `INSERT INTO ${quoteIdentifier(schema)}.${quoteIdentifier(table)} (${columnList}) VALUES (${values});`
    })

    const sql = statements.join('\n')
    const base64Content = Buffer.from(sql, 'utf-8').toString('base64')
    const filename = `${schema}.${table}.sql`

    return {
      base64Content,
      filename,
      mimeType: 'application/sql'
    }
  }

  public async deleteTable(options: DeleteTableOptions): Promise<DeleteTableResult> {
    const pool = this.ensurePool()
    const { schema, table } = options

    const query = `DROP TABLE IF EXISTS ${quoteIdentifier(schema)}.${quoteIdentifier(table)}`

    try {
      await pool.query(query)
      return { success: true }
    } catch (error) {
      throw new Error(`${error}`)
    }
  }

  public async createTable(options: CreateTableOptions): Promise<CreateTableResult> {
    const pool = this.ensurePool()
    const { schema, table, columns } = options

    if (!columns || columns.length === 0) {
      throw new Error('At least one column is required to create a table')
    }

    const { query } = buildCreateTableQuery({ schema, table, columns })

    try {
      await pool.query(query)
      return { success: true }
    } catch (error) {
      throw new Error(`Failed to create table: ${error}`)
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
      udt_name: string
      is_nullable: 'YES' | 'NO'
      column_default: unknown
      is_primary_key: boolean
      fk_constraint_name: string | null
      referenced_table_schema: string | null
      referenced_table_name: string | null
      referenced_column_name: string | null
      delete_rule: string | null
      update_rule: string | null
      enum_values: string | null
    }>(QUERIES.LIST_COLUMNS, [schema, table])

    return result.rows.map((row) => {
      const enumValues = parsePostgresArray(row.enum_values)

      return {
        name: row.column_name,
        type: row.data_type === 'USER-DEFINED' ? row.udt_name : row.data_type,
        nullable: row.is_nullable === 'YES',
        defaultValue: row.column_default ?? undefined,
        isPrimaryKey: row.is_primary_key,
        enumValues: enumValues.length > 0 ? enumValues : undefined,
        foreignKey:
          row.fk_constraint_name &&
          row.referenced_table_schema &&
          row.referenced_table_name &&
          row.referenced_column_name
            ? {
                referencedSchema: row.referenced_table_schema,
                referencedTable: row.referenced_table_name,
                referencedColumn: row.referenced_column_name,
                onDelete: (row.delete_rule || 'NO ACTION') as
                  | 'CASCADE'
                  | 'RESTRICT'
                  | 'SET NULL'
                  | 'SET DEFAULT'
                  | 'NO ACTION',
                onUpdate: (row.update_rule || 'NO ACTION') as
                  | 'CASCADE'
                  | 'RESTRICT'
                  | 'SET NULL'
                  | 'SET DEFAULT'
                  | 'NO ACTION'
              }
            : undefined
      }
    })
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
