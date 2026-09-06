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
  'savedQueries',
  'notes'
])

// ── Per-type settings schemas ──

const kpiWidgetSettingsSchema = z.object({
  valueField: z.string(),
  labelField: z.string().optional(),
  prefix: z.string().optional(),
  suffix: z.string().optional(),
  formatType: z.enum(['number', 'currency', 'percentage']).optional(),
  decimals: z.number().optional(),
  compareField: z.string().optional(),
  compareLabel: z.string().optional()
})

const tableWidgetSettingsSchema = z.object({
  columns: z.array(z.string()).optional(),
  pageSize: z.number().optional(),
  sortable: z.boolean().optional(),
  filterable: z.boolean().optional()
})

const chartWidgetSettingsSchema = z.object({
  xAxisField: z.string(),
  yAxisField: z.string(),
  colorField: z.string().optional(),
  showLegend: z.boolean().optional(),
  showGrid: z.boolean().optional(),
  colors: z.array(z.string()).optional(),
  orientation: z.enum(['vertical', 'horizontal']).optional()
})

const pieChartWidgetSettingsSchema = z.object({
  labelField: z.string(),
  showLegend: z.boolean().optional(),
  showTable: z.boolean().optional(),
  colors: z.array(z.string()).optional()
})

const scatterWidgetSettingsSchema = z.object({
  xAxisField: z.string(),
  yAxisField: z.string(),
  labelField: z.string().optional(),
  showGrid: z.boolean().optional(),
  colors: z.array(z.string()).optional()
})

const savedQueriesWidgetSettingsSchema = z.object({
  content: z.string()
})

const notesWidgetSettingsSchema = z.object({
  content: z.string()
})

// Pass-through: allow extra unknown keys for forward-compatibility
const withPassthrough = <T extends z.ZodObject<any>>(schema: T) => schema.passthrough()

export const widgetSchema = z.discriminatedUnion('type', [
  z.object({
    id: z.string().min(1),
    type: z.literal('kpi'),
    title: z.string(),
    queryId: z.string().nullable(),
    customQuery: z.string().optional(),
    position: widgetPositionSchema,
    settings: withPassthrough(kpiWidgetSettingsSchema)
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('table'),
    title: z.string(),
    queryId: z.string().nullable(),
    customQuery: z.string().optional(),
    position: widgetPositionSchema,
    settings: withPassthrough(tableWidgetSettingsSchema)
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('barChart'),
    title: z.string(),
    queryId: z.string().nullable(),
    customQuery: z.string().optional(),
    position: widgetPositionSchema,
    settings: withPassthrough(chartWidgetSettingsSchema)
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('lineChart'),
    title: z.string(),
    queryId: z.string().nullable(),
    customQuery: z.string().optional(),
    position: widgetPositionSchema,
    settings: withPassthrough(chartWidgetSettingsSchema)
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('pieChart'),
    title: z.string(),
    queryId: z.string().nullable(),
    customQuery: z.string().optional(),
    position: widgetPositionSchema,
    settings: withPassthrough(pieChartWidgetSettingsSchema)
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('scatterChart'),
    title: z.string(),
    queryId: z.string().nullable(),
    customQuery: z.string().optional(),
    position: widgetPositionSchema,
    settings: withPassthrough(scatterWidgetSettingsSchema)
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('savedQueries'),
    title: z.string(),
    queryId: z.string().nullable(),
    customQuery: z.string().optional(),
    position: widgetPositionSchema,
    settings: withPassthrough(savedQueriesWidgetSettingsSchema)
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('notes'),
    title: z.string(),
    queryId: z.string().nullable(),
    customQuery: z.string().optional(),
    position: widgetPositionSchema,
    settings: withPassthrough(notesWidgetSettingsSchema)
  })
])

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
  userId: z.string().optional(),
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
