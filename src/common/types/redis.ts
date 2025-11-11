import type { BaseAdapter } from './adapter'

/**
 * Redis connection options
 */
export interface RedisConnectionOptions {
  host: string
  port: number
  database?: number // 0-15, default 0
  password?: string
  username?: string // Redis 6+ ACL
  ssl?: boolean | object
  // Sentinel/Cluster options can be added later
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
  ttl?: number // Time to live in seconds, -1 if no expiry, -2 if key doesn't exist
  size?: number // Memory size in bytes
  value?: unknown // Optional: actual value for small keys
}

/**
 * Redis adapter interface
 */
export interface RedisAdapter extends BaseAdapter {
  /**
   * List all database numbers (0-15)
   */
  listDatabases(): Promise<number[]>

  /**
   * Scan keys matching a pattern
   */
  scanKeys(pattern?: string, limit?: number): Promise<string[]>

  /**
   * Get detailed information about a key
   */
  getKeyInfo(key: string): Promise<KeyInfo>
}
