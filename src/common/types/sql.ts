import type { QueryResultRow } from 'pg'
import type { BaseAdapter } from './adapter'

/**
 * PostgreSQL SSL mode
 */
export type PostgreSQLSslMode = 'disable' | 'allow' | 'prefer' | 'require' | 'verify-ca' | 'verify-full'

/**
 * SQL database connection options (PostgreSQL, MySQL)
 */
export interface SQLConnectionOptions {
  host: string
  port: number
  database: string
  user: string
  password: string
  sslMode?: PostgreSQLSslMode
}

/**
 * Interface for column metadata
 */
export interface ColumnInfo {
  name: string
  type: string
  nullable: boolean
  defaultValue?: unknown
  isPrimaryKey?: boolean
  enumValues?: string[]
  foreignKey?: ForeignKeyInfo
}

/**
 * Foreign key reference information
 */
export interface ForeignKeyInfo {
  referencedSchema: string
  referencedTable: string
  referencedColumn: string
  onDelete: 'CASCADE' | 'RESTRICT' | 'SET NULL' | 'SET DEFAULT' | 'NO ACTION'
  onUpdate: 'CASCADE' | 'RESTRICT' | 'SET NULL' | 'SET DEFAULT' | 'NO ACTION'
}

/**
 * Column metadata included with table data results
 */
export interface TableDataColumn {
  name: string
  dataType: string
  isPrimaryKey?: boolean
  enumValues?: string[]
  foreignKey?: ForeignKeyInfo
}

/**
 * Interface for table constraint metadata
 */
export interface ConstraintInfo {
  name: string
  type: string
  columns: string[]
  foreignTable?: {
    schema: string
    name: string
  }
  foreignColumns?: string[]
}

/**
 * Interface for index metadata
 */
export interface IndexInfo {
  name: string
  columns: string[]
  unique: boolean
}

/**
 * Interface for table structure information (SQL databases)
 */
export interface TableInfo {
  name: string
  schema: string
  columns: ColumnInfo[]
  constraints?: ConstraintInfo[]
  indexes?: IndexInfo[]
}

/**
 * Options for fetching table data with pagination, filtering, and sorting
 */
export type SqlParameter = string | number | bigint | boolean | Date | Buffer | null

export type TableFilterOperator =
  | '='
  | '<>'
  | '>'
  | '<'
  | '>='
  | '<='
  | 'LIKE'
  | 'ILIKE'
  | 'IN'
  | 'IS'

export type TableFilterIsValue = 'NULL' | 'NOT NULL' | 'TRUE' | 'FALSE'

export type TableFilterScalar = Exclude<SqlParameter, Buffer | null>

export interface BaseTableFilterCondition {
  column: string
}

export interface TableFilterScalarCondition extends BaseTableFilterCondition {
  operator: Exclude<TableFilterOperator, 'IN' | 'IS'>
  value: TableFilterScalar
}

export interface TableFilterInCondition extends BaseTableFilterCondition {
  operator: 'IN'
  value: readonly TableFilterScalar[]
}

export interface TableFilterIsCondition extends BaseTableFilterCondition {
  operator: 'IS'
  value: TableFilterIsValue
}

export type TableFilterCondition =
  | TableFilterScalarCondition
  | TableFilterInCondition
  | TableFilterIsCondition

export interface TableSortRule {
  column: string
  direction: 'ASC' | 'DESC'
}

export interface TableDataOptions {
  schema: string
  table: string
  filters?: TableFilterCondition[]
  sortRules?: TableSortRule[]
  limit?: number
  offset?: number
}

/**
 * Result of fetching table data
 */
export interface TableDataResult {
  rows: QueryResultRow[]
  columns: TableDataColumn[]
  totalCount: number
  rowCount: number
  executionTime: number
  primaryKeyColumns: string[]
}

export interface DeleteTableRowsOptions {
  schema: string
  table: string
  rows: QueryResultRow[]
}

export interface DeleteTableRowsResult {
  deletedRowCount: number
}

/**
 * Options for updating a single cell in a table
 */
export interface UpdateTableCellOptions {
  schema: string
  table: string
  columnToUpdate: string
  newValue: unknown
  row: QueryResultRow
}

/**
 * Result of updating a table cell
 */
export interface UpdateTableCellResult {
  updatedRowCount: number
}

/**
 * Options for exporting table data
 */
export interface ExportTableOptions {
  schema: string
  table: string
  filters?: TableFilterCondition[]
  sortRules?: TableSortRule[]
}

/**
 * Result of exporting table data
 */
export interface ExportTableResult {
  base64Content: string
  filename: string
  mimeType: string
}

export interface DeleteTableOptions {
  schema: string
  table: string
}

export interface DeleteTableResult {
  success: boolean
}

/**
 * Schema with its tables
 */
export interface SchemaWithTables {
  schema: string
  tables: string[]
}

/**
 * SQL adapter interface (PostgreSQL, MySQL)
 */
export interface SQLAdapter extends BaseAdapter {
  /**
   * List all schemas in the database
   */
  listSchemas(): Promise<string[]>

  /**
   * List all tables in a specific schema
   */
  listTables(schema: string): Promise<string[]>

  /**
   * List all schemas with their tables
   */
  listSchemaWithTables(): Promise<SchemaWithTables[]>

  /**
   * Get detailed information about a table structure
   */
  introspectTable(schema: string, table: string): Promise<TableInfo>

  /**
   * Fetch data from a table with optional pagination and filtering
   */
  fetchTableData(options: TableDataOptions): Promise<TableDataResult>

  /**
   * Delete rows from a table using their primary keys
   */
  deleteTableRows(options: DeleteTableRowsOptions): Promise<DeleteTableRowsResult>

  /**
   * Update a single cell in a table using primary keys to identify the row
   */
  updateTableCell(options: UpdateTableCellOptions): Promise<UpdateTableCellResult>

  /**
   * Export table data as CSV
   */
  exportTableAsCSV(options: ExportTableOptions): Promise<ExportTableResult>

  /**
   * Export table data as SQL INSERT statements
   */
  exportTableAsSQL(options: ExportTableOptions): Promise<ExportTableResult>

  /**
   * Delete a table from the database
   */
  deleteTable(options: DeleteTableOptions): Promise<DeleteTableResult>
}
