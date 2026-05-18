import type { BaseAdapter, QueryResultRow } from './adapter'

/**
 * PostgreSQL SSL mode
 */
export type PostgreSQLSslMode =
  | 'disable'
  | 'allow'
  | 'prefer'
  | 'require'
  | 'verify-ca'
  | 'verify-full'

/**
 * SQL database connection options (PostgreSQL)
 */
export interface SQLConnectionOptions {
  host: string
  port: number
  database: string
  user: string
  password: string
  sslMode?: PostgreSQLSslMode
  /**
   * When true, the connection rejects any non-SELECT/SHOW SQL and all
   * table-mutating IPC calls (insert/update/delete row, create/drop table).
   */
  readOnly?: boolean
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
 * Options for inserting a new row into a table
 */
export interface InsertTableRowOptions {
  schema: string
  table: string
  values: Record<string, unknown>
}

/**
 * Result of inserting a table row
 */
export interface InsertTableRowResult {
  insertedRowCount: number
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
 * Column definition for creating/altering tables
 */
export interface ColumnDefinition {
  name: string
  type: string
  nullable?: boolean
  defaultValue?: string
  isPrimaryKey?: boolean
  isUnique?: boolean
  foreignKey?: {
    schema: string
    table: string
    column: string
    onDelete: 'CASCADE' | 'RESTRICT' | 'SET NULL' | 'SET DEFAULT' | 'NO ACTION'
    onUpdate: 'CASCADE' | 'RESTRICT' | 'SET NULL' | 'SET DEFAULT' | 'NO ACTION'
  }
}

/**
 * Options for creating a new table
 */
export interface CreateTableOptions {
  schema: string
  table: string
  columns: ColumnDefinition[]
}

/**
 * Result of creating a table
 */
export interface CreateTableResult {
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
 * SQL adapter interface (PostgreSQL)
 */
export interface SQLAdapter extends BaseAdapter {
  listSchemas(): Promise<string[]>
  listTables(schema: string): Promise<string[]>
  listSchemaWithTables(): Promise<SchemaWithTables[]>
  introspectTable(schema: string, table: string): Promise<TableInfo>
  fetchTableData(options: TableDataOptions): Promise<TableDataResult>
  deleteTableRows(options: DeleteTableRowsOptions): Promise<DeleteTableRowsResult>
  updateTableCell(options: UpdateTableCellOptions): Promise<UpdateTableCellResult>
  insertTableRow(options: InsertTableRowOptions): Promise<InsertTableRowResult>
  exportTableAsCSV(options: ExportTableOptions): Promise<ExportTableResult>
  exportTableAsSQL(options: ExportTableOptions): Promise<ExportTableResult>
  deleteTable(options: DeleteTableOptions): Promise<DeleteTableResult>
  createTable(options: CreateTableOptions): Promise<CreateTableResult>
}
