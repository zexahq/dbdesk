import type { QueryResultRow } from 'pg'
import type { MongoDBAdapter } from './mongodb'
import type { RedisAdapter } from './redis'
import type { SQLAdapter } from './sql'

/**
 * Options for running a query
 */
export interface RunQueryOptions {
  limit?: number
  offset?: number
}

/**
 * Interface for query execution results
 */
export interface QueryResult {
  rows: QueryResultRow[]
  columns: string[]
  rowCount: number
  executionTime?: number
  // Pagination metadata (only present for SELECT queries)
  totalRowCount?: number
  limit?: number
  offset?: number
}

/**
 * Base adapter interface with common methods for all database adapters
 */
export interface BaseAdapter {
  /**
   * Establish connection to the database
   */
  connect(): Promise<void>

  /**
   * Close the database connection
   */
  disconnect(): Promise<void>

  /**
   * Execute a query and return results
   */
  runQuery(query: string, options?: RunQueryOptions): Promise<QueryResult>
}

/**
 * Union type for all database adapters
 */
export type DBAdapter = SQLAdapter | MongoDBAdapter | RedisAdapter
