import type { ConnectionProfile, DashboardConfig, Widget } from '@dbdesk/shared/types'

export function formatConnectionsTable(connections: ConnectionProfile[]): string {
  if (connections.length === 0) return 'No connections found.'

  const rows = connections.map((c) => {
    const opts = c.options as unknown as Record<string, unknown>
    return {
      id: c.id,
      name: c.name,
      type: c.type,
      host: String(opts.host ?? '-'),
      database: String(opts.database ?? '-')
    }
  })

  const cols = ['Name', 'Type', 'Host', 'Database', 'ID']
  const widths = [
    Math.max(cols[0].length, ...rows.map((r) => r.name.length)),
    Math.max(cols[1].length, ...rows.map((r) => r.type.length)),
    Math.max(cols[2].length, ...rows.map((r) => r.host.length)),
    Math.max(cols[3].length, ...rows.map((r) => r.database.length)),
    Math.max(cols[4].length, ...rows.map((r) => r.id.length))
  ]

  const header =
    cols.map((c, i) => c.padEnd(widths[i])).join('  ') +
    '\n' +
    widths.map((w) => '-'.repeat(w)).join('  ')

  const body = rows
    .map(
      (r) =>
        [r.name, r.type, r.host, r.database, r.id]
          .map((v, i) => v.padEnd(widths[i]))
          .join('  ')
    )
    .join('\n')

  return header + '\n' + body
}

export function formatTable(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '(empty)'

  const keys = Object.keys(data[0])
  const widths = keys.map((k) =>
    Math.max(k.length, ...data.map((r) => String(r[k] ?? '').length))
  )

  const header =
    keys.map((k, i) => k.padEnd(widths[i])).join('  ') +
    '\n' +
    widths.map((w) => '-'.repeat(w)).join('  ')

  const body = data
    .map((row) => keys.map((k, i) => String(row[k] ?? '').padEnd(widths[i])).join('  '))
    .join('\n')

  return header + '\n' + body
}

export function formatSchemasTable(schemas: string[]): string {
  return schemas.join('\n')
}

export function formatSchemaTree(
  entries: { schema: string; tables: string[] }[]
): string {
  return entries
    .map((s) => `${s.schema}/ (${s.tables.length} tables)\n` + s.tables.map((t) => `  └─ ${t}`).join('\n'))
    .join('\n')
}

export function formatDashboardsTable(dashboards: DashboardConfig[]): string {
  if (dashboards.length === 0) return 'No dashboards found.'

  const rows = dashboards.map((d) => ({
    id: d.dashboardId,
    name: d.name,
    widgets: String(d.widgets.length),
    updated: d.updatedAt.toISOString().split('T')[0]
  }))

  return formatTable(rows)
}

export function formatDashboardJson(dashboard: DashboardConfig): string {
  return JSON.stringify(
    {
      dashboardId: dashboard.dashboardId,
      connectionId: dashboard.connectionId,
      name: dashboard.name,
      description: dashboard.description,
      layout: dashboard.layout,
      widgets: dashboard.widgets.map((w) => ({
        id: w.id,
        type: w.type,
        title: w.title,
        queryId: w.queryId,
        customQuery: w.customQuery,
        position: w.position,
        settings: w.settings
      })),
      createdAt: dashboard.createdAt,
      updatedAt: dashboard.updatedAt
    },
    null,
    2
  )
}

export function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2)
}

export function formatResult(
  data: unknown,
  format: 'table' | 'json' | 'csv' = 'table'
): string {
  switch (format) {
    case 'json':
      return JSON.stringify({ ok: true, data }, null, 2)
    case 'csv': {
      if (Array.isArray(data)) {
        const keys = data.length > 0 ? Object.keys(data[0]) : []
        const header = keys.join(',')
        const body = data.map((r) => keys.map((k) => JSON.stringify(String(r[k] ?? ''))).join(',')).join('\n')
        return header + '\n' + body
      }
      return JSON.stringify(data)
    }
    default:
      if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
        return formatTable(data as Record<string, unknown>[])
      }
      return String(data)
  }
}

export function errorResult(message: string, format: 'table' | 'json' = 'table'): string {
  if (format === 'json') {
    return JSON.stringify({ ok: false, error: message }, null, 2)
  }
  return `Error: ${message}`
}
