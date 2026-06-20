import { z } from 'zod'

// ── SSL Modes ──

export const postgreSQLSslModeSchema = z.enum([
  'disable',
  'allow',
  'prefer',
  'require',
  'verify-ca',
  'verify-full'
])

// ── Database Types ──

export const databaseTypeSchema = z.enum(['postgres', 'mongodb', 'redis'])

export const sqlDatabaseTypeSchema = z.enum(['postgres'])

// ── Connection Options ──

export const sqlConnectionOptionsSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  database: z.string().min(1),
  user: z.string().min(1),
  password: z.string().min(1),
  sslMode: postgreSQLSslModeSchema.optional()
})

export const mongoDBConnectionOptionsSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  database: z.string().min(1),
  user: z.string().optional(),
  password: z.string().optional(),
  connectionString: z.string().optional(),
  authSource: z.string().optional(),
  replicaSet: z.string().optional(),
  ssl: z.union([z.boolean(), z.object({}).passthrough()]).optional()
})

export const redisConnectionOptionsSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  database: z.number().int().min(0).max(15).optional(),
  password: z.string().optional(),
  username: z.string().optional(),
  ssl: z.union([z.boolean(), z.object({}).passthrough()]).optional()
})

export const dbConnectionOptionsSchema = z.union([
  sqlConnectionOptionsSchema,
  mongoDBConnectionOptionsSchema,
  redisConnectionOptionsSchema
])

// ── Connection Profiles ──

const baseProfileFields = {
  id: z.string().uuid(),
  name: z.string().min(1),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  lastConnectedAt: z.coerce.date().optional()
}

export const sqlConnectionProfileSchema = z.object({
  ...baseProfileFields,
  type: sqlDatabaseTypeSchema,
  options: sqlConnectionOptionsSchema
})

export const mongoDBConnectionProfileSchema = z.object({
  ...baseProfileFields,
  type: z.literal('mongodb'),
  options: mongoDBConnectionOptionsSchema
})

export const redisConnectionProfileSchema = z.object({
  ...baseProfileFields,
  type: z.literal('redis'),
  options: redisConnectionOptionsSchema
})

export const connectionProfileSchema = z.discriminatedUnion('type', [
  sqlConnectionProfileSchema,
  mongoDBConnectionProfileSchema,
  redisConnectionProfileSchema
])

// ── Create / Update ──

export const createConnectionSchema = z.object({
  name: z.string().min(1),
  type: databaseTypeSchema,
  options: dbConnectionOptionsSchema
})

export const updateConnectionSchema = createConnectionSchema.extend({
  connectionId: z.string().uuid()
})

// ── Inferred Types ──

export type DatabaseTypeSchema = z.infer<typeof databaseTypeSchema>
export type SQLDatabaseTypeSchema = z.infer<typeof sqlDatabaseTypeSchema>
export type SQLConnectionOptionsSchema = z.infer<typeof sqlConnectionOptionsSchema>
export type MongoDBConnectionOptionsSchema = z.infer<typeof mongoDBConnectionOptionsSchema>
export type RedisConnectionOptionsSchema = z.infer<typeof redisConnectionOptionsSchema>
export type DBConnectionOptionsSchema = z.infer<typeof dbConnectionOptionsSchema>
export type ConnectionProfileSchema = z.infer<typeof connectionProfileSchema>
export type CreateConnectionInput = z.infer<typeof createConnectionSchema>
export type UpdateConnectionInput = z.infer<typeof updateConnectionSchema>
