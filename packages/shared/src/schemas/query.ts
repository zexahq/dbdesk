import { z } from 'zod'

// ── Query ──

export const runQueryOptionsSchema = z.object({
  limit: z.number().int().min(1).optional(),
  offset: z.number().int().min(0).optional(),
})

export const queryResultSchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())),
  columns: z.array(z.string()),
  rowCount: z.number().int(),
  executionTime: z.number().optional(),
  totalRowCount: z.number().int().optional(),
  limit: z.number().int().optional(),
  offset: z.number().int().optional(),
})

export const queryBatchResultSchema = z.object({
  query: z.string(),
  result: queryResultSchema.optional(),
  error: z.string().optional(),
  executionTime: z.number(),
})

export type RunQueryOptionsSchema = z.infer<typeof runQueryOptionsSchema>
export type QueryResultSchema = z.infer<typeof queryResultSchema>
export type QueryBatchResultSchema = z.infer<typeof queryBatchResultSchema>
