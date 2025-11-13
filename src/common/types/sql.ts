import type { BaseAdapter } from './adapter'
import type { QueryResultRow } from 'pg'

/**
 * SQL database connection options (PostgreSQL, MySQL)
 */
export interface SQLConnectionOptions {
  host: string
  port: number
  database: string
  user: string
  password: string
  ssl?: boolean | object
}

/**
 * Interface for column metadata
 */
export interface ColumnInfo {
  name: string
  type: string
  nullable: boolean
  defaultValue?: unknown
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

export interface TableDataOptions {
  schema: string
  table: string
  filters?: TableFilterCondition[]
  sortColumn?: string
  sortOrder?: 'ASC' | 'DESC'
  limit?: number
  offset?: number
}

/**
 * Result of fetching table data
 */
export interface TableDataResult {
  rows: QueryResultRow[]
  columns: string[]
  totalCount: number
  rowCount: number
  executionTime: number
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
   * Get detailed information about a table structure
   */
  introspectTable(schema: string, table: string): Promise<TableInfo>

  /**
   * Fetch data from a table with optional pagination and filtering
   */
  fetchTableData(options: TableDataOptions): Promise<TableDataResult>
}
