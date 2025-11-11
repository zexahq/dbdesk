import type { SQLAdapter } from './sql'
import type { MongoDBAdapter } from './mongodb'
import type { RedisAdapter } from './redis'

/**
 * Generic type for query result rows
 */
export type QueryResultRow = Record<string, unknown>

/**
 * Interface for query execution results
 */
export interface QueryResult {
  rows: QueryResultRow[]
  columns: string[]
  rowCount: number
  executionTime?: number
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
  runQuery(query: string): Promise<QueryResult>
}

/**
 * Union type for all database adapters
 */
export type DBAdapter = SQLAdapter | MongoDBAdapter | RedisAdapter
