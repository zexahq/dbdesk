import type { BaseAdapter } from './adapter'

/**
 * MongoDB connection options
 */
export interface MongoDBConnectionOptions {
  host: string
  port: number
  database: string
  user?: string
  password?: string
  connectionString?: string // Alternative to individual fields
  authSource?: string
  replicaSet?: string
  ssl?: boolean | object
}

/**
 * Interface for MongoDB index information
 */
export interface MongoDBIndexInfo {
  name: string
  keys: Record<string, 1 | -1 | 'text' | '2d' | '2dsphere' | 'geoHaystack' | 'hashed'>
  unique?: boolean
  sparse?: boolean
}

/**
 * Interface for MongoDB collection information
 */
export interface CollectionInfo {
  name: string
  documentCount?: number
  validationSchema?: object
  indexes?: MongoDBIndexInfo[]
}

/**
 * MongoDB adapter interface
 */
export interface MongoDBAdapter extends BaseAdapter {
  /**
   * List all databases
   */
  listDatabases(): Promise<string[]>

  /**
   * List all collections in a database
   */
  listCollections(database: string): Promise<string[]>

  /**
   * Get detailed information about a collection
   */
  introspectCollection(database: string, collection: string): Promise<CollectionInfo>
}
