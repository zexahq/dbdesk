/**
 * Central export file for all common types
 * Import from here for convenience: import { ... } from '@common/types'
 */

// Base adapter types
export type { QueryResultRow } from 'pg'
export type { BaseAdapter, DBAdapter, QueryResult } from './adapter'

// SQL types
export type {
  ColumnInfo,
  DeleteTableRowsOptions,
  DeleteTableRowsResult,
  IndexInfo,
  SQLAdapter,
  SQLConnectionOptions,
  SchemaWithTables,
  TableDataColumn,
  TableDataOptions,
  TableDataResult,
  TableFilterCondition,
  TableInfo,
  TableSortRule,
  UpdateTableCellOptions,
  UpdateTableCellResult
} from './sql'

// MongoDB types
export type {
  CollectionInfo,
  MongoDBAdapter,
  MongoDBConnectionOptions,
  MongoDBIndexInfo
} from './mongodb'

// Redis types
export type { KeyInfo, RedisAdapter, RedisConnectionOptions, RedisKeyType } from './redis'

// Connection types
export type {
  ConnectionProfile,
  DBConnectionOptions,
  DatabaseType,
  MongoDBConnectionProfile,
  RedisConnectionProfile,
  SQLConnectionProfile,
  SQLDatabaseType
} from './connection'

// Workspace types
export type {
  ConnectionWorkspace,
  SavedQuery,
  SavedQueriesStorage,
  SerializedQueryTab,
  SerializedTab,
  SerializedTableTab,
  WorkspaceStorage
} from './workspace'
