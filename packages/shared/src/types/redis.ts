import type { BaseAdapter } from './adapter'

/**
 * Redis connection options
 */
export interface RedisConnectionOptions {
  host: string
  port: number
  database?: number
  password?: string
  username?: string
  ssl?: boolean | object
}

/**
 * Redis key types
 */
export type RedisKeyType = 'string' | 'hash' | 'list' | 'set' | 'zset' | 'stream' | 'none'

/**
 * Interface for Redis key information
 */
export interface KeyInfo {
  key: string
  type: RedisKeyType
  ttl?: number
  size?: number
  value?: unknown
}

/**
 * Redis adapter interface
 */
export interface RedisAdapter extends BaseAdapter {
  listDatabases(): Promise<number[]>
  scanKeys(pattern?: string, limit?: number): Promise<string[]>
  getKeyInfo(key: string): Promise<KeyInfo>
}
