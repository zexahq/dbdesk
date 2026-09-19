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

export const connectionEnvironmentSchema = z.enum(['development', 'staging', 'production'])

export const sshTunnelOptionsSchema = z.object({
  enabled: z.boolean(),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535).optional(),
  user: z.string().min(1),
  identityFile: z.string().optional()
})

// ── Database Types ──

export const databaseTypeSchema = z.enum(['postgres', 'mongodb', 'redis'])

export const sqlDatabaseTypeSchema = z.enum(['postgres'])

// ── Connection Options ──

export const sqlConnectionOptionsSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  database: z.string().min(1),
  user: z.string().min(1),
  password: z.string(),
  sslMode: postgreSQLSslModeSchema.optional(),
  sslRootCertPath: z.string().optional(),
  sslClientCertPath: z.string().optional(),
  sslClientKeyPath: z.string().optional(),
  sshTunnel: sshTunnelOptionsSchema.optional(),
  environment: connectionEnvironmentSchema.optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  group: z.string().optional(),
  tags: z.array(z.string().min(1)).optional(),
  readOnly: z.boolean().optional(),
  statementTimeoutMs: z.number().int().min(0).max(86_400_000).optional()
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

const postgresConnectionInputSchema = z.object({
  name: z.string().min(1),
  type: z.literal('postgres'),
  options: sqlConnectionOptionsSchema
})
const mongoDBConnectionInputSchema = z.object({
  name: z.string().min(1),
  type: z.literal('mongodb'),
  options: mongoDBConnectionOptionsSchema
})
const redisConnectionInputSchema = z.object({
  name: z.string().min(1),
  type: z.literal('redis'),
  options: redisConnectionOptionsSchema
})

export const createConnectionSchema = z.discriminatedUnion('type', [
  postgresConnectionInputSchema,
  mongoDBConnectionInputSchema,
  redisConnectionInputSchema
])

export const updateConnectionSchema = z.discriminatedUnion('type', [
  postgresConnectionInputSchema.extend({ connectionId: z.string().uuid() }),
  mongoDBConnectionInputSchema.extend({ connectionId: z.string().uuid() }),
  redisConnectionInputSchema.extend({ connectionId: z.string().uuid() })
])

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
