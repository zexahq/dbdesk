import type { DashboardConfig, Widget, WidgetPosition, WidgetType } from '@dbdesk/shared/types'
import { isReadOnlyQuery } from '@dbdesk/shared/adapters'
import { dashboardLayoutSchema, widgetSchema } from '@dbdesk/shared/schemas'

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

const QUERY_WIDGETS: WidgetType[] = [
  'kpi',
  'table',
  'barChart',
  'lineChart',
  'pieChart',
  'scatterChart'
]

const dashboardDocLayoutSchema = dashboardLayoutSchema.partial()

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
    position?:
      | [number, number, number, number]
      | { x: number; y: number; w: number; h: number }
      | string
    settings?: Record<string, unknown>
  }>
}

export function parseDashboardDoc(raw: string): DashboardDoc {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (err) {
    throw new Error(`Invalid JSON: ${err instanceof Error ? err.message : String(err)}`)
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Dashboard file must be a JSON object with "dashboard" and "widgets" keys.')
  }
  const doc = parsed as Record<string, unknown>
  if (doc.version !== undefined && doc.version !== 1) {
    throw new Error(
      `Unsupported dashboard file version "${String(doc.version)}". Expected version 1.`
    )
  }
  const meta = doc.dashboard as Record<string, unknown> | undefined
  if (!meta || typeof meta !== 'object') {
    throw new Error('Dashboard file is missing the "dashboard" object.')
  }
  if (typeof meta.name !== 'string' || meta.name.trim() === '') {
    throw new Error('Dashboard file: "dashboard.name" is required.')
  }
  if (typeof meta.connection !== 'string' || meta.connection.trim() === '') {
    throw new Error('Dashboard file: "dashboard.connection" (name or ID) is required.')
  }
  if (!Array.isArray(doc.widgets)) {
    throw new Error('Dashboard file: "widgets" must be an array (can be empty: "widgets": []).')
  }
  if (meta.description !== undefined && typeof meta.description !== 'string') {
    throw new Error('Dashboard file: "dashboard.description" must be a string.')
  }

  let layout: DashboardDoc['dashboard']['layout']
  if (meta.layout !== undefined) {
    const parsedLayout = dashboardDocLayoutSchema.safeParse(meta.layout)
    if (!parsedLayout.success) {
      throw new Error(
        parsedLayout.error.issues
          .map(
            (issue) =>
              `dashboard.layout${issue.path.length ? `.${issue.path.join('.')}` : ''}: ${issue.message}`
          )
          .join('\n')
      )
    }
    layout = parsedLayout.data
  }

  return {
    version: 1,
    dashboard: {
      name: meta.name.trim(),
      description: typeof meta.description === 'string' ? meta.description : undefined,
      connection: meta.connection.trim(),
      layout
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
  if (
    parts.length !== 4 ||
    parts.some((n) => !Number.isInteger(n)) ||
    parts[0]! < 0 ||
    parts[1]! < 0 ||
    parts[2]! < 1 ||
    parts[3]! < 1
  ) {
    throw new Error(
      'Widget position must use integers, with x/y >= 0 and w/h >= 1 (e.g. "0,0,6,4").'
    )
  }
  return {
    x: parts[0] as number,
    y: parts[1] as number,
    w: parts[2] as number,
    h: parts[3] as number
  }
}

/**
 * Validate document widgets without mutating storage; safe for --dry-run.
 */
export function buildWidgets(rawWidgets: DashboardDoc['widgets']): {
  widgets: Widget[]
  errors: string[]
} {
  const errors: string[] = []
  const widgets: Widget[] = []

  rawWidgets.forEach((raw, i) => {
    const label = `widgets[${i}]`
    const fail = (msg: string) => errors.push(`${label}: ${msg}`)

    if (!raw || typeof raw !== 'object') {
      fail('must be an object with type/title.')
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

    if (raw.query !== undefined && (typeof raw.query !== 'string' || !raw.query.trim())) {
      fail('"query" must be a non-empty string.')
      return
    }
    if (raw.queryId !== undefined && (typeof raw.queryId !== 'string' || !raw.queryId.trim())) {
      fail('"queryId" must be a non-empty string.')
      return
    }
    if (raw.query && raw.queryId) {
      fail('use either "query" or "queryId", not both.')
      return
    }
    if (
      raw.settings !== undefined &&
      (typeof raw.settings !== 'object' || raw.settings === null || Array.isArray(raw.settings))
    ) {
      fail('"settings" must be an object.')
      return
    }

    const settings = { ...(raw.settings ?? {}) }

    if (QUERY_WIDGETS.includes(type)) {
      if (!raw.query && !raw.queryId) {
        fail('a "query" or "queryId" is required for this widget type.')
        return
      }
      if (raw.query && !isReadOnlyQuery(raw.query)) {
        fail('widget queries must be read-only (SELECT/SHOW).')
        return
      }
    } else if (type === 'notes') {
      if (typeof settings.content !== 'string' || settings.content.trim() === '') {
        fail('notes widgets require "settings.content".')
        return
      }
    } else if (type === 'savedQueries' && settings.content === undefined) {
      settings.content = ''
    }

    if (!QUERY_WIDGETS.includes(type) && (raw.query || raw.queryId)) {
      fail(`${type} widgets do not accept "query" or "queryId".`)
      return
    }

    const widget = widgetSchema.safeParse({
      id: crypto.randomUUID(),
      type,
      title: raw.title.trim(),
      queryId: raw.queryId?.trim() ?? null,
      customQuery: raw.query?.trim(),
      position,
      settings
    })
    if (!widget.success) {
      fail(
        widget.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')
      )
      return
    }
    widgets.push(widget.data as Widget)
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
      ...(w.customQuery ? { query: w.customQuery } : w.queryId ? { queryId: w.queryId } : {}),
      position: [w.position.x, w.position.y, w.position.w, w.position.h],
      settings: w.settings ?? {}
    }))
  }
  return JSON.stringify(doc, null, 2) + '\n'
}
