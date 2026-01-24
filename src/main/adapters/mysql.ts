import type {
  ColumnDefinition,
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
import type { FieldPacket, Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import * as mysql from 'mysql2/promise'
import { performance } from 'node:perf_hooks'

import type {
  ExportTableOptions,
  ExportTableResult,
  SchemaWithTables,
  TableDataOptions,
  TableDataResult
} from '@common/types/sql'
import {
  QUERIES,
  buildTableCountQuery,
  buildTableDataQuery,
  buildUpdateCellQuery
} from '../lib/mysql/queries'
import { quoteIdentifier } from '../lib/mysql/utils'
import { isSelectableQuery, normalizeQuery } from '../lib/sql-parser'

const DEFAULT_TIMEOUT_MS = 30_000

export class MySQLAdapter implements SQLAdapter {
  private pool: Pool | null = null

  constructor(private readonly options: SQLConnectionOptions) {}

  public async connect(): Promise<void> {
    if (this.pool) {
      return
    }

    const pool = mysql.createPool({
      host: this.options.host,
      port: this.options.port,
      database: this.options.database,
      user: this.options.user,
      password: this.options.password,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: DEFAULT_TIMEOUT_MS
    })

    try {
      const connection = await pool.getConnection()
      try {
        await connection.query(QUERIES.TEST_CONNECTION)
      } finally {
        connection.release()
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
        pool.query<RowDataPacket[]>(countQuery),
        pool.query<RowDataPacket[]>(paginatedQuery)
      ])

      const executionTime = performance.now() - start
      const [countRows] = countResult
      const [pageRows, pageFields] = pageResult

      const totalRow = (countRows as RowDataPacket[])[0]?.total
      const totalRowCount = typeof totalRow === 'number' ? totalRow : Number(totalRow ?? 0)

      const transformedResult = this.transformResult(pageRows, pageFields, executionTime)
      return {
        ...transformedResult,
        totalRowCount,
        limit: options.limit,
        offset: options.offset
      }
    }

    // For non-SELECT queries or when no pagination options provided
    const [rows, fields] = await pool.query<RowDataPacket[]>(normalizedQuery)
    const executionTime = performance.now() - start

    return this.transformResult(rows, fields, executionTime)
  }

  public async listSchemas(): Promise<string[]> {
    const pool = this.ensurePool()

    const [rows] = await pool.query<RowDataPacket[]>(QUERIES.LIST_SCHEMAS)

    return rows.map((row) => row.schema_name as string)
  }

  public async listTables(schema: string): Promise<string[]> {
    const pool = this.ensurePool()

    const [rows] = await pool.query<RowDataPacket[]>(QUERIES.LIST_TABLES, [schema])

    return rows.map((row) => row.table_name as string)
  }

  public async listSchemaWithTables(): Promise<SchemaWithTables[]> {
    const pool = this.ensurePool()

    // Use the connected database name for both schema_name and WHERE filter
    const [rows] = await pool.query<RowDataPacket[]>(QUERIES.LIST_SCHEMAS_WITH_TABLES, [
      this.options.database,
      this.options.database
    ])

    // If no rows returned (database has no tables), return schema with empty tables array
    if (rows.length === 0) {
      return [
        {
          schema: this.options.database,
          tables: []
        }
      ]
    }

    // Ensure schema_name is never undefined by using the connected database
    return rows.map((row) => ({
      schema: (row.schema_name as string) || this.options.database,
      tables: this.parseJSONArray(row.tables)
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

    // Build queries
    const { query, params } = buildTableDataQuery(options)
    const { query: countQuery, params: countParams } = buildTableCountQuery(options)

    // Execute data, count, and column metadata queries in parallel
    const [dataResult, countResult, columnInfo] = await Promise.all([
      pool.query<RowDataPacket[]>(query, params),
      pool.query<RowDataPacket[]>(countQuery, countParams),
      this.queryColumns(pool, options.schema, options.table)
    ])

    const executionTime = performance.now() - start

    // Ensure columnInfo has valid name and type - if not, try to get from dataResult fields
    const [dataRows, dataFields] = dataResult
    const columns =
      columnInfo.length > 0
        ? columnInfo.map((column) => ({
            name: column.name || '',
            dataType: column.type || '',
            isPrimaryKey: column.isPrimaryKey ?? false,
            enumValues: column.enumValues,
            foreignKey: column.foreignKey
          }))
        : // Fallback: if columnInfo is empty, use field names from the data query
          dataFields.map((field) => ({
            name: field.name,
            dataType: '', // We don't have type info from the data query
            isPrimaryKey: false,
            enumValues: undefined,
            foreignKey: undefined
          }))

    const primaryKeyColumns = columnInfo.filter((column) => column.isPrimaryKey).map((c) => c.name)
    const totalCount = (countResult[0][0] as { total: number }).total ?? 0

    return {
      rows: dataRows as Record<string, unknown>[],
      columns,
      totalCount,
      rowCount: dataRows.length,
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

    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()
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
          .map((column) => `${quoteIdentifier(column)} = ?`)
          .join(' AND ')

        const query = `DELETE FROM ${quoteIdentifier(schema)}.${quoteIdentifier(table)} WHERE ${whereClause}`
        const [result] = await connection.query<ResultSetHeader>(query, values)
        deletedRowCount += result.affectedRows ?? 0
      }

      await connection.commit()

      return { deletedRowCount }
    } catch (error) {
      await connection.rollback().catch(() => {})
      throw error
    } finally {
      connection.release()
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

    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      const [result] = await connection.query<ResultSetHeader>(query, params)

      await connection.commit()

      return {
        updatedRowCount: result.affectedRows ?? 0
      }
    } catch (error) {
      await connection.rollback().catch(() => {})
      throw error
    } finally {
      connection.release()
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

    const columns = cleanedValues.map(([col]) => `\`${col}\``)
    const placeholders = cleanedValues.map(() => '?')
    const params = cleanedValues.map(([, value]) => value)

    const query = `
      INSERT INTO \`${schema}\`.\`${table}\` (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
    `

    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      const [result] = await connection.query<ResultSetHeader>(query, params)

      await connection.commit()

      return {
        insertedRowCount: result.affectedRows ?? 0
      }
    } catch (error) {
      await connection.rollback().catch(() => {})
      throw error
    } finally {
      connection.release()
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
    const [rows] = await pool.query<RowDataPacket[]>(query, params)

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
    const lines = rows.map((row) => {
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
    const [rows] = await pool.query<RowDataPacket[]>(query, params)

    // Serialize SQL
    const serializeSqlValue = (value: unknown): string => {
      if (value === null || value === undefined) return 'NULL'
      if (typeof value === 'number' || typeof value === 'bigint') return String(value)
      if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
      const str = String(value).replace(/'/g, "''")
      return `'${str}'`
    }

    const columnList = columnInfo.map((col) => quoteIdentifier(col.name)).join(', ')

    const statements = rows.map((row) => {
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

    const columnDefinitions = columns.map((col) => this.buildColumnDefinition(col)).join(', ')

    const primaryKeys = columns.filter((col) => col.isPrimaryKey).map((col) => col.name)
    const primaryKeyConstraint =
      primaryKeys.length > 0
        ? `, PRIMARY KEY (${primaryKeys.map((name) => quoteIdentifier(name)).join(', ')})`
        : ''

    const query = `CREATE TABLE ${quoteIdentifier(schema)}.${quoteIdentifier(table)} (${columnDefinitions}${primaryKeyConstraint})`

    try {
      await pool.query(query)
      return { success: true }
    } catch (error) {
      throw new Error(`Failed to create table: ${error}`)
    }
  }

  private buildColumnDefinition(col: ColumnDefinition): string {
    let def = `${quoteIdentifier(col.name)} ${col.type.toUpperCase()}`

    if (col.nullable === false) {
      def += ' NOT NULL'
    } else if (col.nullable === true) {
      def += ' NULL'
    }

    if (col.defaultValue !== undefined) {
      def += ` DEFAULT ${col.defaultValue}`
    }

    if (col.isUnique) {
      def += ' UNIQUE'
    }

    // Foreign key constraint
    if (col.foreignKey) {
      def += ` REFERENCES ${quoteIdentifier(col.foreignKey.table)}(${quoteIdentifier(col.foreignKey.column)})`
      if (col.foreignKey.onDelete) {
        def += ` ON DELETE ${col.foreignKey.onDelete}`
      }
      if (col.foreignKey.onUpdate) {
        def += ` ON UPDATE ${col.foreignKey.onUpdate}`
      }
    }

    return def
  }

  private ensurePool(): Pool {
    if (!this.pool) {
      throw new Error('MySQL adapter is not connected')
    }

    return this.pool
  }

  private transformResult(
    rows: RowDataPacket[],
    fields: FieldPacket[],
    executionTime: number
  ): QueryResult {
    const columns = fields.map((field) => field.name)

    return {
      rows: rows as Record<string, unknown>[],
      columns,
      rowCount: rows.length,
      executionTime
    }
  }

  private parseJSONArray(jsonArray: unknown): string[] {
    if (!jsonArray) {
      return []
    }

    try {
      if (typeof jsonArray === 'string') {
        const parsed = JSON.parse(jsonArray)
        return Array.isArray(parsed) ? parsed.filter((item) => item !== null) : []
      }
      if (Array.isArray(jsonArray)) {
        return jsonArray.filter((item) => item !== null)
      }
      return []
    } catch {
      return []
    }
  }

  private parseEnumValues(columnType: string | null): string[] | undefined {
    if (!columnType || !columnType.startsWith('enum(')) {
      return undefined
    }

    // Extract enum values from column_type like "enum('value1','value2','value3')"
    const match = columnType.match(/enum\((.*)\)/)
    if (!match) {
      return undefined
    }

    const values = match[1]
      .split(',')
      .map((v) => v.trim().replace(/^'|'$/g, ''))
      .filter((v) => v.length > 0)

    return values.length > 0 ? values : undefined
  }

  private async queryColumns(pool: Pool, schema: string, table: string) {
    const [rows, fields] = await pool.query<RowDataPacket[]>(QUERIES.LIST_COLUMNS, [schema, table])

    // Create a map of field names to indices for reliable access
    const fieldIndexMap = new Map<string, number>()
    fields.forEach((field, index) => {
      fieldIndexMap.set(field.name.toLowerCase(), index)
      fieldIndexMap.set(field.name, index) // Also store original case
    })

    return rows.map((row) => {
      // Access row data - try both direct property access and indexed access
      const getField = (fieldName: string): unknown => {
        // Try direct property access first (most common case)
        if (row[fieldName] !== undefined) return row[fieldName]
        // Try lowercase
        if (row[fieldName.toLowerCase()] !== undefined) return row[fieldName.toLowerCase()]
        // Try uppercase
        if (row[fieldName.toUpperCase()] !== undefined) return row[fieldName.toUpperCase()]
        // Fallback to indexed access using fields array
        const index = fieldIndexMap.get(fieldName.toLowerCase())
        if (index !== undefined && Array.isArray(row)) {
          return row[index]
        }
        return undefined
      }

      const columnName = (getField('column_name') as string) || ''
      const dataType = (getField('data_type') as string) || ''
      const isNullable = (getField('is_nullable') as string) || ''
      const columnDefault = getField('column_default')
      const isPrimaryKey = Boolean(getField('is_primary_key'))
      const enumValues = this.parseEnumValues((getField('enum_values') as string) || null)

      const fkConstraintName = getField('fk_constraint_name')
      const referencedTableSchema = getField('referenced_table_schema')
      const referencedTableName = getField('referenced_table_name')
      const referencedColumnName = getField('referenced_column_name')

      return {
        name: columnName,
        type: dataType,
        nullable: isNullable === 'YES',
        defaultValue: columnDefault ?? undefined,
        isPrimaryKey,
        enumValues,
        foreignKey:
          fkConstraintName && referencedTableSchema && referencedTableName && referencedColumnName
            ? {
                referencedSchema: referencedTableSchema as string,
                referencedTable: referencedTableName as string,
                referencedColumn: referencedColumnName as string,
                onDelete: (getField('delete_rule') || 'NO ACTION') as
                  | 'CASCADE'
                  | 'RESTRICT'
                  | 'SET NULL'
                  | 'SET DEFAULT'
                  | 'NO ACTION',
                onUpdate: (getField('update_rule') || 'NO ACTION') as
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
    const [rows] = await pool.query<RowDataPacket[]>(QUERIES.LIST_CONSTRAINTS, [schema, table])

    return rows.map((row) => ({
      name: row.constraint_name as string,
      type: row.constraint_type as string,
      columns: row.columns ? (row.columns as string).split(',') : [],
      foreignTable:
        row.foreign_table_name && row.foreign_table_schema
          ? { schema: row.foreign_table_schema as string, name: row.foreign_table_name as string }
          : undefined,
      foreignColumns: row.foreign_columns ? (row.foreign_columns as string).split(',') : undefined
    }))
  }

  private async queryIndexes(
    pool: Pool,
    schema: string,
    table: string
  ): Promise<TableInfo['indexes']> {
    const [rows] = await pool.query<RowDataPacket[]>(QUERIES.LIST_INDEXES, [schema, table])

    return rows.map((row) => ({
      name: row.index_name as string,
      columns: row.column_names ? (row.column_names as string).split(',') : [],
      unique: Boolean(row.is_unique)
    }))
  }
}

export const createMySQLAdapter = (options: SQLConnectionOptions): MySQLAdapter => {
  return new MySQLAdapter(options)
}
