import type { BaseAdapter } from './adapter'

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
  columns: ColumnInfo[]
  primaryKey?: string[]
  indexes?: IndexInfo[]
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
}
