import type { Widget, WidgetType, WidgetPosition, WidgetSettings } from '@dbdesk/shared/types'
import {
  resolveConnectionId,
  resolveConnection,
  listDashboards,
  getDashboard,
  createDashboard,
  deleteDashboard,
  saveDashboard,
  listSavedQueries
} from '../lib/db-access'
import { formatDashboardsTable, formatDashboardJson, formatResult, errorResult } from '../lib/format'
import type { Command } from 'commander'

function generateId(): string {
  return crypto.randomUUID()
}

function resolveWidgetPosition(raw: string | undefined): WidgetPosition {
  if (!raw) {
    return { x: 0, y: 0, w: 6, h: 4 }
  }
  const parts = raw.split(',').map(Number)
  if (parts.length !== 4) {
    throw new Error('Position must be in format "x,y,w,h" (e.g. "0,0,6,4")')
  }
  return { x: parts[0], y: parts[1], w: parts[2], h: parts[3] }
}

function parseSettings(raw: string[] | undefined): Record<string, unknown> {
  if (!raw || raw.length === 0) return {}
  const settings: Record<string, unknown> = {}
  for (const item of raw) {
    const eqIndex = item.indexOf('=')
    if (eqIndex === -1) continue
    const key = item.substring(0, eqIndex)
    const value = item.substring(eqIndex + 1)

    if (value === 'true') settings[key] = true
    else if (value === 'false') settings[key] = false
    else if (!isNaN(Number(value)) && value !== '') settings[key] = Number(value)
    else settings[key] = value
  }
  return settings
}

export function registerDashboardCommands(program: Command): void {
  const dashCmd = program.command('dashboard').description('Manage dashboards')

  dashCmd
    .command('list')
    .description('List all dashboards for a connection')
    .requiredOption('-c, --connection <name-or-id>', 'connection name or ID')
    .option('--format <format>', 'output format: table or json', 'table')
    .action((opts: { connection: string; format: string }) => {
      const connectionId = resolveConnectionId(opts.connection)
      const dashboards = listDashboards(connectionId)
      if (opts.format === 'json') {
        console.log(formatResult(dashboards, 'json'))
        return
      }
      console.log(formatDashboardsTable(dashboards))
    })

  dashCmd
    .command('show <dashboard-id>')
    .description('Show a dashboard configuration')
    .option('--format <format>', 'output format: json or table', 'json')
    .action((dashboardId: string, opts: { format: string }) => {
      const dashboard = getDashboard(dashboardId)
      if (!dashboard) {
        console.error(errorResult(`Dashboard "${dashboardId}" not found.`, 'table'))
        process.exit(1)
      }
      if (opts.format === 'json') {
        console.log(formatDashboardJson(dashboard))
      } else {
        console.log(`Name: ${dashboard.name}`)
        console.log(`ID: ${dashboard.dashboardId}`)
        console.log(`Connection: ${dashboard.connectionId}`)
        console.log(`Widgets: ${dashboard.widgets.length}`)
        console.log(`Created: ${dashboard.createdAt.toISOString()}`)
        console.log(`Updated: ${dashboard.updatedAt.toISOString()}`)
        if (dashboard.description) console.log(`Description: ${dashboard.description}`)
      }
    })

  dashCmd
    .command('create')
    .description('Create a new dashboard')
    .requiredOption('-c, --connection <name-or-id>', 'connection name or ID')
    .requiredOption('-n, --name <name>', 'dashboard name')
    .option('-d, --description <text>', 'dashboard description')
    .option('--format <format>', 'output format: json or table', 'json')
    .action(
      (opts: { connection: string; name: string; description?: string; format: string }) => {
        const connectionId = resolveConnectionId(opts.connection)
        const dashboard = createDashboard(connectionId, opts.name, opts.description)
        console.log(formatDashboardJson(dashboard))
      }
    )

  dashCmd
    .command('delete <dashboard-id>')
    .description('Delete a dashboard')
    .action((dashboardId: string) => {
      const deleted = deleteDashboard(dashboardId)
      if (deleted) {
        console.log(`Dashboard "${dashboardId}" deleted.`)
      } else {
        console.error(errorResult(`Dashboard "${dashboardId}" not found.`, 'table'))
        process.exit(1)
      }
    })

  dashCmd
    .command('add-widget')
    .description('Add a widget to a dashboard')
    .requiredOption('-c, --connection <name-or-id>', 'connection name or ID')
    .requiredOption('-d, --dashboard <dashboard-id>', 'dashboard ID')
    .requiredOption('--type <type>', 'widget type: kpi, table, barChart, lineChart, pieChart, scatterChart, notes, savedQueries')
    .requiredOption('--title <title>', 'widget title')
    .option('--query <sql>', 'inline SQL query for the widget')
    .option('--query-id <id>', 'reference a saved query by ID')
    .option('--position <x,y,w,h>', 'grid position (default: 0,0,6,4)')
    .option('--settings <key=value...>', 'widget-specific settings (can be specified multiple times)')
    .option('--format <format>', 'output format: json or table', 'json')
    .action(
      async (opts: {
        connection: string
        dashboard: string
        type: string
        title: string
        query?: string
        queryId?: string
        position?: string
        settings?: string[]
        format: string
      }) => {
        try {
          const dashboard = getDashboard(opts.dashboard)
          if (!dashboard) {
            console.error(errorResult(`Dashboard "${opts.dashboard}" not found.`, 'table'))
            process.exit(1)
          }

          const widgetType = opts.type as WidgetType
          const validTypes: WidgetType[] = [
            'kpi', 'table', 'barChart', 'lineChart', 'pieChart',
            'scatterChart', 'notes', 'savedQueries'
          ]
          if (!validTypes.includes(widgetType)) {
            console.error(
              errorResult(
                `Invalid widget type "${opts.type}". Valid types: ${validTypes.join(', ')}`,
                'table'
              )
            )
            process.exit(1)
          }

          if (!opts.query && !opts.queryId && !['notes', 'savedQueries'].includes(widgetType)) {
            console.error(
              errorResult(
                'A query or query-id is required for this widget type.',
                'table'
              )
            )
            process.exit(1)
          }

          const position = resolveWidgetPosition(opts.position)
          const settings = parseSettings(opts.settings) as WidgetSettings

          const widget: Widget = {
            id: generateId(),
            type: widgetType,
            title: opts.title,
            queryId: opts.queryId ?? null,
            customQuery: opts.query,
            position,
            settings
          }

          const updated = saveDashboard({
            ...dashboard,
            widgets: [...dashboard.widgets, widget],
            updatedAt: new Date()
          })

          console.log(formatDashboardJson(updated))
        } catch (err) {
          console.error(String(err))
          process.exit(1)
        }
      }
    )

  dashCmd
    .command('remove-widget')
    .description('Remove a widget from a dashboard')
    .requiredOption('-d, --dashboard <dashboard-id>', 'dashboard ID')
    .requiredOption('-w, --widget <widget-id>', 'widget ID to remove')
    .option('--format <format>', 'output format: json or table', 'json')
    .action((opts: { dashboard: string; widget: string; format: string }) => {
      const dashboard = getDashboard(opts.dashboard)
      if (!dashboard) {
        console.error(errorResult(`Dashboard "${opts.dashboard}" not found.`, 'table'))
        process.exit(1)
      }

      const filtered = dashboard.widgets.filter((w) => w.id !== opts.widget)
      if (filtered.length === dashboard.widgets.length) {
        console.error(errorResult(`Widget "${opts.widget}" not found in dashboard.`, 'table'))
        process.exit(1)
      }

      const updated = saveDashboard({
        ...dashboard,
        widgets: filtered,
        updatedAt: new Date()
      })

      console.log(formatDashboardJson(updated))
    })

  dashCmd
    .command('update-widget')
    .description('Update a widget in a dashboard')
    .requiredOption('-d, --dashboard <dashboard-id>', 'dashboard ID')
    .requiredOption('-w, --widget <widget-id>', 'widget ID to update')
    .option('--title <title>', 'new widget title')
    .option('--query <sql>', 'new inline SQL query')
    .option('--position <x,y,w,h>', 'new grid position')
    .option('--settings <key=value...>', 'new widget settings')
    .option('--format <format>', 'output format: json or table', 'json')
    .action(
      (opts: {
        dashboard: string
        widget: string
        title?: string
        query?: string
        position?: string
        settings?: string[]
        format: string
      }) => {
        const dashboard = getDashboard(opts.dashboard)
        if (!dashboard) {
          console.error(errorResult(`Dashboard "${opts.dashboard}" not found.`, 'table'))
          process.exit(1)
        }

        const widgetIndex = dashboard.widgets.findIndex((w) => w.id === opts.widget)
        if (widgetIndex === -1) {
          console.error(errorResult(`Widget "${opts.widget}" not found.`, 'table'))
          process.exit(1)
        }

        const existing = dashboard.widgets[widgetIndex]
        const updated: Widget = {
          ...existing,
          title: opts.title ?? existing.title,
          customQuery: opts.query !== undefined ? opts.query : existing.customQuery,
          position: opts.position ? resolveWidgetPosition(opts.position) : existing.position,
          settings: opts.settings
            ? ({ ...existing.settings, ...parseSettings(opts.settings) } as WidgetSettings)
            : existing.settings
        }

        dashboard.widgets[widgetIndex] = updated
        const saved = saveDashboard({
          ...dashboard,
          updatedAt: new Date()
        })

        console.log(formatDashboardJson(saved))
      }
    )
}
