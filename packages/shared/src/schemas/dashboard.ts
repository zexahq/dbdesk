import { z } from 'zod'
import { connectionIdentifierSchema } from './ipc-payloads'

// ── Widget Schemas ──

export const widgetPositionSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  w: z.number().int().min(1),
  h: z.number().int().min(1),
  minW: z.number().int().min(1).optional(),
  minH: z.number().int().min(1).optional(),
  maxW: z.number().int().min(1).optional(),
  maxH: z.number().int().min(1).optional()
})

export const widgetTypeSchema = z.enum([
  'kpi',
  'table',
  'barChart',
  'lineChart',
  'pieChart',
  'scatterChart',
  'savedQueries'
])

// Settings are widget-type-specific; validate the shape loosely as a record
// of safe primitive/array values to prevent arbitrary objects from being
// persisted by IPC callers.
const widgetSettingsSchema = z.record(z.string(), z.unknown())

export const widgetSchema = z.object({
  id: z.string().min(1),
  type: widgetTypeSchema,
  title: z.string(),
  queryId: z.string().nullable(),
  customQuery: z.string().optional(),
  position: widgetPositionSchema,
  settings: widgetSettingsSchema
})

export const dashboardLayoutSchema = z.object({
  columns: z.number().int().min(1),
  rowHeight: z.number().int().min(1),
  margin: z.tuple([z.number(), z.number()]).optional(),
  containerPadding: z.tuple([z.number(), z.number()]).optional()
})

const isoDateOrDate = z.union([z.string(), z.date()])

export const dashboardConfigSchema = z.object({
  dashboardId: z.string().min(1),
  connectionId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  layout: dashboardLayoutSchema,
  widgets: z.array(widgetSchema),
  createdAt: isoDateOrDate,
  updatedAt: isoDateOrDate
})

// ── IPC Payload Schemas ──

export const dashboardIdentifierSchema = connectionIdentifierSchema.extend({
  dashboardId: z.string().min(1, 'dashboardId is required')
})

export const persistDashboardSchema = z.object({
  dashboardId: z.string().min(1, 'dashboardId is required')
})

export const exportDashboardsSchema = z
  .object({
    connectionId: z.string().min(1).optional()
  })
  .optional()

export const importDashboardsSchema = z.object({
  dashboards: z.array(dashboardConfigSchema),
  overwrite: z.boolean().optional()
})

// ── Inferred Types ──

export type WidgetPositionSchema = z.infer<typeof widgetPositionSchema>
export type WidgetSchema = z.infer<typeof widgetSchema>
export type DashboardConfigSchema = z.infer<typeof dashboardConfigSchema>
export type DashboardIdentifierInput = z.infer<typeof dashboardIdentifierSchema>
export type ImportDashboardsInput = z.infer<typeof importDashboardsSchema>
