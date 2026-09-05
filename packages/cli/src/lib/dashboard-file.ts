import yaml from 'js-yaml'
import type { DashboardConfig, Widget, WidgetPosition, WidgetSettings, WidgetType } from '@dbdesk/shared/types'
import { isReadOnlyQuery } from '@dbdesk/shared/adapters'
import { warn } from './output'

export const WIDGET_TYPES: WidgetType[] = [
  'kpi',
  'table',
  'barChart',
  'lineChart',
  'pieChart',
  'scatterChart',
  'notes',
  'savedQueries'
]

const QUERY_WIDGETS: WidgetType[] = ['kpi', 'table', 'barChart', 'lineChart', 'pieChart', 'scatterChart']

const RECOMMENDED_SETTINGS: Partial<Record<WidgetType, string[]>> = {
  kpi: ['valueField'],
  barChart: ['xAxisField', 'yAxisField'],
  lineChart: ['xAxisField', 'yAxisField'],
  pieChart: ['labelField', 'valueField'],
  scatterChart: ['xAxisField', 'yAxisField']
}

export interface DashboardDoc {
  version: 1
  dashboard: {
    name: string
    description?: string
    connection: string
    layout?: { columns?: number; rowHeight?: number; margin?: [number, number] }
  }
  widgets: Array<{
    type: string
    title: string
    query?: string
    queryId?: string
    position?: [number, number, number, number] | { x: number; y: number; w: number; h: number } | string
    settings?: Record<string, unknown>
  }>
}

export function parseDashboardDoc(raw: string): DashboardDoc {
  let parsed: unknown
  try {
    parsed = yaml.load(raw)
  } catch (err) {
    throw new Error(`Invalid YAML: ${err instanceof Error ? err.message : String(err)}`)
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Dashboard file must be a YAML mapping with "dashboard" and "widgets" keys.')
  }
  const doc = parsed as Record<string, unknown>
  if (doc.version !== undefined && doc.version !== 1) {
    throw new Error(`Unsupported dashboard file version "${String(doc.version)}". Expected version 1.`)
  }
  const meta = doc.dashboard as Record<string, unknown> | undefined
  if (!meta || typeof meta !== 'object') {
    throw new Error('Dashboard file is missing the "dashboard" mapping.')
  }
  if (typeof meta.name !== 'string' || meta.name.trim() === '') {
    throw new Error('Dashboard file: "dashboard.name" is required.')
  }
  if (typeof meta.connection !== 'string' || meta.connection.trim() === '') {
    throw new Error('Dashboard file: "dashboard.connection" (name or ID) is required.')
  }
  if (!Array.isArray(doc.widgets)) {
    throw new Error('Dashboard file: "widgets" must be a list (can be empty: widgets: []).')
  }
  return {
    version: 1,
    dashboard: {
      name: meta.name.trim(),
      description: typeof meta.description === 'string' ? meta.description : undefined,
      connection: meta.connection.trim(),
      layout:
        meta.layout && typeof meta.layout === 'object'
          ? (meta.layout as DashboardDoc['dashboard']['layout'])
          : undefined
    },
    widgets: doc.widgets as DashboardDoc['widgets']
  }
}

export function resolveWidgetPosition(raw: unknown): WidgetPosition {
  const fallback: WidgetPosition = { x: 0, y: 0, w: 6, h: 4 }
  if (raw === undefined) return fallback
  let parts: number[]
  if (typeof raw === 'string') {
    parts = raw.split(',').map(Number)
  } else if (Array.isArray(raw)) {
    parts = raw.map(Number)
  } else if (typeof raw === 'object' && raw !== null) {
    const p = raw as Record<string, unknown>
    parts = [Number(p.x ?? 0), Number(p.y ?? 0), Number(p.w ?? 6), Number(p.h ?? 4)]
  } else {
    throw new Error('Widget position must be "x,y,w,h", [x, y, w, h], or {x, y, w, h}.')
  }
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n < 0)) {
    throw new Error('Widget position must be "x,y,w,h" with non-negative numbers (e.g. "0,0,6,4").')
  }
  return { x: parts[0] as number, y: parts[1] as number, w: parts[2] as number, h: parts[3] as number }
}

/**
 * Validate doc widgets, returning errors (fatal) and collecting warnings.
 * Pure apart from warn() — safe for --dry-run.
 */
export function buildWidgets(rawWidgets: DashboardDoc['widgets']): { widgets: Widget[]; errors: string[] } {
  const errors: string[] = []
  const widgets: Widget[] = []

  rawWidgets.forEach((raw, i) => {
    const label = `widgets[${i}]`
    const fail = (msg: string) => errors.push(`${label}: ${msg}`)

    if (!raw || typeof raw !== 'object') {
      fail('must be a mapping with type/title.')
      return
    }
    if (!WIDGET_TYPES.includes(raw.type as WidgetType)) {
      fail(`unknown type "${String(raw.type)}". Valid types: ${WIDGET_TYPES.join(', ')}.`)
      return
    }
    const type = raw.type as WidgetType
    if (typeof raw.title !== 'string' || raw.title.trim() === '') {
      fail('"title" is required.')
      return
    }

    let position: WidgetPosition
    try {
      position = resolveWidgetPosition(raw.position)
    } catch (err) {
      fail(err instanceof Error ? err.message : String(err))
      return
    }

    const settings = (raw.settings ?? {}) as Record<string, unknown>

    if (QUERY_WIDGETS.includes(type)) {
      if (!raw.query && !raw.queryId) {
        fail('a "query" or "queryId" is required for this widget type.')
        return
      }
      if (raw.query && !isReadOnlyQuery(raw.query)) {
        fail('widget queries must be read-only (SELECT/SHOW).')
        return
      }
      for (const key of RECOMMENDED_SETTINGS[type] ?? []) {
        if (settings[key] === undefined) {
          warn(`${label} (${type} "${raw.title}"): recommended setting "${key}" is missing.`)
        }
      }
    } else if (type === 'notes') {
      if (typeof settings.content !== 'string' || settings.content.trim() === '') {
        fail('notes widgets require "settings.content".')
        return
      }
    }

    widgets.push({
      id: crypto.randomUUID(),
      type,
      title: raw.title.trim(),
      queryId: raw.queryId ?? null,
      customQuery: raw.query,
      position,
      settings: settings as WidgetSettings
    })
  })

  return { widgets, errors }
}

export function dashboardToDoc(dashboard: DashboardConfig, connectionName: string): string {
  const doc = {
    version: 1,
    dashboard: {
      name: dashboard.name,
      ...(dashboard.description ? { description: dashboard.description } : {}),
      connection: connectionName,
      layout: dashboard.layout
    },
    widgets: dashboard.widgets.map((w: Widget) => ({
      type: w.type,
      title: w.title,
      ...(w.customQuery ? { query: w.customQuery } : {}),
      ...(w.queryId ? { queryId: w.queryId } : {}),
      position: [w.position.x, w.position.y, w.position.w, w.position.h],
      settings: w.settings ?? {}
    }))
  }
  return yaml.dump(doc, { lineWidth: 120 })
}
