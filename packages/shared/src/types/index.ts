/**
 * Central export file for all shared types
 */

// Base adapter types
// Base adapter types
export type {
  BaseAdapter,
  DBAdapter,
  QueryBatchResult,
  QueryResult,
  QueryResultRow,
  RunQueryOptions,
} from './adapter'

// SQL types
export type {
  BaseTableFilterCondition,
  ColumnDefinition,
  ColumnInfo,
  ConstraintInfo,
  CreateTableOptions,
  CreateTableResult,
  DeleteTableOptions,
  DeleteTableResult,
  DeleteTableRowsOptions,
  DeleteTableRowsResult,
  ExportTableOptions,
  ExportTableResult,
  ForeignKeyInfo,
  IndexInfo,
  InsertTableRowOptions,
  InsertTableRowResult,
  EditorQueryBlock,
  PostgreSQLSslMode,
  SQLAdapter,
  SQLConnectionOptions,
  SchemaWithTables,
  SqlParameter,
  TableDataColumn,
  TableDataOptions,
  TableDataResult,
  TableFilterCondition,
  TableFilterInCondition,
  TableFilterIsCondition,
  TableFilterIsValue,
  TableFilterOperator,
  TableFilterScalar,
  TableFilterScalarCondition,
  TableInfo,
  TableSortRule,
  UpdateTableCellOptions,
  UpdateTableCellResult,
} from './sql'

// MongoDB types
export type {
  CollectionInfo,
  MongoDBAdapter,
  MongoDBConnectionOptions,
  MongoDBIndexInfo,
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
  SQLDatabaseType,
} from './connection'

// Workspace types
export type {
  ConnectionWorkspace,
  SavedQueriesStorage,
  SavedQuery,
  SerializedQueryTab,
  SerializedTab,
  SerializedTableTab,
  WorkspaceStorage,
} from './workspace'
