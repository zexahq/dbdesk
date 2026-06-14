import { z } from 'zod'
import { tableFilterConditionSchema, tableSortRuleSchema } from './table'

// ── Workspace Schemas ──

export const serializedTableTabSchema = z.object({
  kind: z.literal('table'),
  id: z.string().min(1),
  schema: z.string().min(1),
  table: z.string().min(1),
  isTemporary: z.boolean(),
  view: z.enum(['tables', 'structure']),
  limit: z.number().int().min(1),
  offset: z.number().int().min(0),
  filters: z.array(tableFilterConditionSchema).optional(),
  sortRules: z.array(tableSortRuleSchema).optional()
})

export const serializedQueryTabSchema = z.object({
  kind: z.literal('query'),
  id: z.string().min(1),
  name: z.string().min(1),
  editorContent: z.string(),
  isTemporary: z.boolean(),
  lastSavedContent: z.string().optional()
})

export const serializedDashboardTabSchema = z.object({
  kind: z.literal('dashboard'),
  id: z.string().min(1),
  dashboardId: z.string().min(1),
  name: z.string().min(1)
})

export const serializedTabSchema = z.discriminatedUnion('kind', [
  serializedTableTabSchema,
  serializedQueryTabSchema,
  serializedDashboardTabSchema
])

export const savedQuerySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  content: z.string()
})

export const connectionWorkspaceSchema = z.object({
  connectionId: z.string().min(1),
  tabs: z.array(serializedTabSchema),
  activeTabId: z.string().nullable()
})

// ── Inferred Types ──

export type SerializedTabSchema = z.infer<typeof serializedTabSchema>
export type SavedQuerySchema = z.infer<typeof savedQuerySchema>
export type ConnectionWorkspaceSchema = z.infer<typeof connectionWorkspaceSchema>
