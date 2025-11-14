/**
 * Central export file for all common types
 * Import from here for convenience: import { ... } from '@common/types'
 */

// Base adapter types
export type { QueryResultRow } from 'pg'
export type { QueryResult, BaseAdapter, DBAdapter } from './adapter'

// SQL types
export type {
  SQLConnectionOptions,
  ColumnInfo,
  IndexInfo,
  TableInfo,
  SQLAdapter,
  TableDataColumn,
  TableDataOptions,
  TableDataResult,
  SchemaWithTables
} from './sql'

// MongoDB types
export type {
  MongoDBConnectionOptions,
  MongoDBIndexInfo,
  CollectionInfo,
  MongoDBAdapter
} from './mongodb'

// Redis types
export type { RedisConnectionOptions, RedisKeyType, KeyInfo, RedisAdapter } from './redis'

// Connection types
export type {
  DatabaseType,
  SQLDatabaseType,
  DBConnectionOptions,
  SQLConnectionProfile,
  MongoDBConnectionProfile,
  RedisConnectionProfile,
  ConnectionProfile
} from './connection'
