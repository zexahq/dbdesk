import { z } from 'zod'

// ── Filter / Sort ──

export const tableFilterOperatorSchema = z.enum([
  '=',
  '<>',
  '>',
  '<',
  '>=',
  '<=',
  'LIKE',
  'ILIKE',
  'IN',
  'IS',
])

export const tableFilterIsValueSchema = z.enum(['NULL', 'NOT NULL', 'TRUE', 'FALSE'])

const filterScalarSchema = z.union([z.string(), z.number(), z.boolean(), z.bigint()])

export const tableFilterScalarConditionSchema = z.object({
  column: z.string().min(1),
  operator: z.enum(['=', '<>', '>', '<', '>=', '<=', 'LIKE', 'ILIKE']),
  value: filterScalarSchema,
})

export const tableFilterInConditionSchema = z.object({
  column: z.string().min(1),
  operator: z.literal('IN'),
  value: z.array(filterScalarSchema).min(1),
})

export const tableFilterIsConditionSchema = z.object({
  column: z.string().min(1),
  operator: z.literal('IS'),
  value: tableFilterIsValueSchema,
})

export const tableFilterConditionSchema = z.discriminatedUnion('operator', [
  tableFilterScalarConditionSchema,
  tableFilterInConditionSchema,
  tableFilterIsConditionSchema,
])

export const tableSortRuleSchema = z.object({
  column: z.string().min(1),
  direction: z.enum(['ASC', 'DESC']),
})

// ── Table Data Options ──

export const tableDataOptionsSchema = z.object({
  schema: z.string().min(1),
  table: z.string().min(1),
  filters: z.array(tableFilterConditionSchema).optional(),
  sortRules: z.array(tableSortRuleSchema).optional(),
  limit: z.number().int().min(1).optional(),
  offset: z.number().int().min(0).optional(),
})

// ── Column Definition ──

const fkActionSchema = z.enum(['CASCADE', 'RESTRICT', 'SET NULL', 'SET DEFAULT', 'NO ACTION'])

export const columnDefinitionSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  nullable: z.boolean().optional(),
  defaultValue: z.string().optional(),
  isPrimaryKey: z.boolean().optional(),
  isUnique: z.boolean().optional(),
  foreignKey: z
    .object({
      schema: z.string().min(1),
      table: z.string().min(1),
      column: z.string().min(1),
      onDelete: fkActionSchema,
      onUpdate: fkActionSchema,
    })
    .optional(),
})

// ── Table Operations ──

export const createTableOptionsSchema = z.object({
  schema: z.string().min(1),
  table: z.string().min(1),
  columns: z.array(columnDefinitionSchema).min(1),
})

export const deleteTableOptionsSchema = z.object({
  schema: z.string().min(1),
  table: z.string().min(1),
})

export const exportTableOptionsSchema = z.object({
  schema: z.string().min(1),
  table: z.string().min(1),
  filters: z.array(tableFilterConditionSchema).optional(),
  sortRules: z.array(tableSortRuleSchema).optional(),
})

export const insertTableRowOptionsSchema = z.object({
  schema: z.string().min(1),
  table: z.string().min(1),
  values: z.record(z.string(), z.unknown()),
})

export const updateTableCellOptionsSchema = z.object({
  schema: z.string().min(1),
  table: z.string().min(1),
  columnToUpdate: z.string().min(1),
  newValue: z.unknown(),
  row: z.record(z.string(), z.unknown()),
})

export const deleteTableRowsOptionsSchema = z.object({
  schema: z.string().min(1),
  table: z.string().min(1),
  rows: z.array(z.record(z.string(), z.unknown())).min(1),
})

// ── Inferred Types ──

export type TableFilterConditionSchema = z.infer<typeof tableFilterConditionSchema>
export type TableSortRuleSchema = z.infer<typeof tableSortRuleSchema>
export type TableDataOptionsSchema = z.infer<typeof tableDataOptionsSchema>
export type ColumnDefinitionSchema = z.infer<typeof columnDefinitionSchema>
export type CreateTableOptionsSchema = z.infer<typeof createTableOptionsSchema>
export type DeleteTableOptionsSchema = z.infer<typeof deleteTableOptionsSchema>
export type ExportTableOptionsSchema = z.infer<typeof exportTableOptionsSchema>
export type InsertTableRowOptionsSchema = z.infer<typeof insertTableRowOptionsSchema>
export type UpdateTableCellOptionsSchema = z.infer<typeof updateTableCellOptionsSchema>
export type DeleteTableRowsOptionsSchema = z.infer<typeof deleteTableRowsOptionsSchema>
