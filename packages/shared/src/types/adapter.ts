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
  /**
   * When true, the query runs inside a READ ONLY transaction on a dedicated
   * client, so Postgres itself rejects any write (including writes hidden
   * in CTE bodies or side-effecting functions that a parser could miss).
   * Defaults to false.
   */
  readOnly?: boolean
  /**
   * Opaque identifier supplied by the renderer so an in-flight query
   * can later be cancelled via `cancelQuery(queryId)`.
   */
  queryId?: string
}

/**
 * Interface for query execution results
 */
export interface QueryResult {
  rows: QueryResultRow[]
  columns: string[]
  rowCount: number
  commandTag?: string
  executionTime?: number
  totalRowCount?: number
  limit?: number
  offset?: number
}

export interface QueryBatchResult {
  query: string
  result?: QueryResult
  error?: string
  executionTime: number
}

/**
 * Base adapter interface with common methods for all database adapters
 */
export interface BaseAdapter {
  connect(): Promise<void>
  disconnect(): Promise<void>
  runQuery(query: string, options?: RunQueryOptions): Promise<QueryResult>
  runManyQueries(queries: string[], options?: RunQueryOptions): Promise<QueryBatchResult[]>
  /**
   * Cancel an in-flight query previously started with the given `queryId`.
   * Returns true when a cancel was actually issued. Optional — adapters
   * that do not support cancellation simply omit it.
   */
  cancelQuery?(queryId: string): Promise<boolean>
}

/**
 * Union type for all database adapters
 */
export type DBAdapter = SQLAdapter | MongoDBAdapter | RedisAdapter

// Re-import from sibling modules for union type
import type { SQLAdapter } from './sql'
import type { MongoDBAdapter } from './mongodb'
import type { RedisAdapter } from './redis'
