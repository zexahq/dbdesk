import type { SQLConnectionOptions } from './sql'
import type { MongoDBConnectionOptions } from './mongodb'
import type { RedisConnectionOptions } from './redis'

/**
 * Supported database adapter types
 */
export type DatabaseType = 'postgres' | 'mysql' | 'mongodb' | 'redis'

/**
 * SQL database types
 */
export type SQLDatabaseType = 'postgres' | 'mysql'

/**
 * Union type for all database connection options
 */
export type DBConnectionOptions =
  | SQLConnectionOptions
  | MongoDBConnectionOptions
  | RedisConnectionOptions

/**
 * Connection profile for SQL databases
 */
export interface SQLConnectionProfile {
  id: string // UUID
  name: string
  type: SQLDatabaseType
  options: SQLConnectionOptions
  createdAt: Date
  updatedAt: Date
  lastConnectedAt?: Date
}

/**
 * Connection profile for MongoDB
 */
export interface MongoDBConnectionProfile {
  id: string // UUID
  name: string
  type: 'mongodb'
  options: MongoDBConnectionOptions
  createdAt: Date
  updatedAt: Date
  lastConnectedAt?: Date
}

/**
 * Connection profile for Redis
 */
export interface RedisConnectionProfile {
  id: string // UUID
  name: string
  type: 'redis'
  options: RedisConnectionOptions
  createdAt: Date
  updatedAt: Date
  lastConnectedAt?: Date
}

/**
 * Union type for all connection profiles (discriminated by type)
 */
export type ConnectionProfile =
  | SQLConnectionProfile
  | MongoDBConnectionProfile
  | RedisConnectionProfile
