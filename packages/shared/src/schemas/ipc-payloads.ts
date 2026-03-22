import { z } from 'zod'
import { createConnectionSchema, updateConnectionSchema } from './connection'
import {
  tableFilterConditionSchema,
  tableSortRuleSchema,
} from './table'
import { connectionWorkspaceSchema } from './workspace'

// ── Connection Identifier ──

export const connectionIdentifierSchema = z.object({
  connectionId: z.string().min(1, 'connectionId is required'),
})

// ── Schema / Table Input ──

export const schemaInputSchema = connectionIdentifierSchema.extend({
  schema: z.string().min(1),
})

export const schemaIntrospectInputSchema = schemaInputSchema.extend({
  table: z.string().min(1),
})

// ── Query Input ──

export const queryInputSchema = connectionIdentifierSchema.extend({
  query: z.string().min(1, 'query is required'),
  limit: z.number().int().min(1).default(50).optional(),
  offset: z.number().int().min(0).default(0).optional(),
})

// ── Table Data Input ──

export const tableDataInputSchema = schemaIntrospectInputSchema.extend({
  limit: z.number().int().min(1).default(50).optional(),
  offset: z.number().int().min(0).default(0).optional(),
  sortRules: z.array(tableSortRuleSchema).optional(),
  filters: z.array(tableFilterConditionSchema).optional(),
})

// ── Delete Rows Input ──

export const deleteRowsInputSchema = schemaIntrospectInputSchema.extend({
  rows: z.array(z.record(z.string(), z.unknown())).min(1, 'rows must be a non-empty array'),
})

// ── Update Cell Input ──

export const updateCellInputSchema = schemaIntrospectInputSchema.extend({
  columnToUpdate: z.string().min(1),
  newValue: z.unknown(),
  row: z.record(z.string(), z.unknown()),
})

// ── Insert Row Input ──

export const insertRowInputSchema = schemaIntrospectInputSchema.extend({
  values: z.record(z.string(), z.unknown()),
})

// ── Export Table Input ──

export const exportTableInputSchema = schemaIntrospectInputSchema.extend({
  filters: z.array(tableFilterConditionSchema).optional(),
  sortRules: z.array(tableSortRuleSchema).optional(),
})

// ── Create Table Input ──

export { createConnectionSchema, updateConnectionSchema }

// ── Workspace Input ──

export const workspaceInputSchema = z.object({
  workspace: connectionWorkspaceSchema,
})

// ── Create Table Input (connectionId + table options) ──

export const createTableInputSchema = connectionIdentifierSchema.extend({
  schema: z.string().min(1),
  table: z.string().min(1),
  columns: z.array(z.object({
    name: z.string().min(1),
    type: z.string().min(1),
    nullable: z.boolean().optional(),
    primaryKey: z.boolean().optional(),
    defaultValue: z.string().optional(),
    unique: z.boolean().optional(),
    autoIncrement: z.boolean().optional(),
    references: z.object({
      table: z.string().min(1),
      column: z.string().min(1),
    }).optional(),
  })).min(1),
})

// ── Saved Query Input Schemas ──

export const saveQueryInputSchema = connectionIdentifierSchema.extend({
  id: z.string().min(1),
  name: z.string().min(1),
  content: z.string(),
})

export const deleteQueryInputSchema = connectionIdentifierSchema.extend({
  queryId: z.string().min(1),
})

export const updateQueryInputSchema = connectionIdentifierSchema.extend({
  queryId: z.string().min(1),
  name: z.string().min(1),
  content: z.string(),
})

// ── Inferred Types ──

export type ConnectionIdentifierInput = z.infer<typeof connectionIdentifierSchema>
export type SchemaInput = z.infer<typeof schemaInputSchema>
export type SchemaIntrospectInput = z.infer<typeof schemaIntrospectInputSchema>
export type QueryInput = z.infer<typeof queryInputSchema>
export type TableDataInput = z.infer<typeof tableDataInputSchema>
export type DeleteRowsInput = z.infer<typeof deleteRowsInputSchema>
export type UpdateCellInput = z.infer<typeof updateCellInputSchema>
export type InsertRowInput = z.infer<typeof insertRowInputSchema>
export type ExportTableInput = z.infer<typeof exportTableInputSchema>
export type WorkspaceInput = z.infer<typeof workspaceInputSchema>
