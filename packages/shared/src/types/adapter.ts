/**
 * Generic query result row type.
 * Equivalent to pg's QueryResultRow but without the pg dependency.
 */
export type QueryResultRow = Record<string, unknown>

/**
 * Options for running a query
 */
export interface RunQueryOptions {
  limit?: number
  offset?: number
  /**
   * When true, returns totalRowCount for selectable queries.
   * Defaults to false to avoid expensive COUNT(*) subqueries.
   */
  includeTotalRowCount?: boolean
}

/**
 * Interface for query execution results
 */
export interface QueryResult {
  rows: QueryResultRow[]
  columns: string[]
  rowCount: number
  executionTime?: number
  totalRowCount?: number
  limit?: number
  offset?: number
}

/**
 * Base adapter interface with common methods for all database adapters
 */
export interface BaseAdapter {
  connect(): Promise<void>
  disconnect(): Promise<void>
  runQuery(query: string, options?: RunQueryOptions): Promise<QueryResult>
}

/**
 * Union type for all database adapters
 */
export type DBAdapter = SQLAdapter | MongoDBAdapter | RedisAdapter

// Re-import from sibling modules for union type
import type { SQLAdapter } from './sql'
import type { MongoDBAdapter } from './mongodb'
import type { RedisAdapter } from './redis'
