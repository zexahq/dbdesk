import { readFileSync } from 'node:fs'
import type { DashboardConfig, Widget, WidgetSettings, WidgetType } from '@dbdesk/shared/types'
import {
  connectionRefOrEnv,
  resolveConnection,
  getConnection,
  listDashboards,
  getDashboard,
  createDashboard,
  deleteDashboard,
  saveDashboard
} from '../lib/db-access'
import { runAction, writeData, reportError, warn } from '../lib/output'
import { CliError } from '../lib/errors'
import {
  WIDGET_TYPES,
  parseDashboardDoc,
  resolveWidgetPosition,
  buildWidgets,
  dashboardToDoc
} from '../lib/dashboard-file'
import type { Command } from 'commander'
import { isReadOnlyQuery } from '@dbdesk/shared/adapters'

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
    else if (value !== '' && !Number.isNaN(Number(value))) settings[key] = Number(value)
    else settings[key] = value
  }
  return settings
}

function dashboardSummary(d: DashboardConfig) {
  return {
    dashboardId: d.dashboardId,
    connectionId: d.connectionId,
    name: d.name,
    description: d.description ?? null,
    layout: d.layout,
    widgets: d.widgets.map((w) => ({
      id: w.id,
      type: w.type,
      title: w.title,
      queryId: w.queryId ?? null,
      customQuery: w.customQuery ?? null,
      position: w.position,
      settings: w.settings ?? {}
    })),
    widgetCount: d.widgets.length,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt
  }
}

function requireDashboard(id: string): DashboardConfig {
  const dashboard = getDashboard(id)
  if (!dashboard) {
    throw new CliError(
      'not-found',
      `Dashboard "${id}" not found.`,
      'Use "dbdesk dashboard list --connection <name>" to see available dashboards.'
    )
  }
  return dashboard
}

function requireWidgetType(raw: string): WidgetType {
  if (!WIDGET_TYPES.includes(raw as WidgetType)) {
    throw new CliError('usage', `Invalid widget type "${raw}". Valid types: ${WIDGET_TYPES.join(', ')}.`)
  }
  return raw as WidgetType
}

export function registerDashboardCommands(program: Command): void {
  const dashCmd = program.command('dashboard').description('Manage dashboards')

  dashCmd
    .command('list')
    .description('List dashboards for a connection')
    .option('-c, --connection <name-or-id>', 'connection name or ID (or set DBDESK_CONNECTION)')
    .option('--format <format>', 'output format: table (default) or json', 'table')
    .action((opts: { connection?: string; format: string }) =>
      runAction(opts, ['table', 'json'], () => {
        const connectionId = resolveConnection(connectionRefOrEnv(opts.connection)).id
        return listDashboards(connectionId).map((d) => ({
          id: d.dashboardId,
          name: d.name,
          widgets: d.widgets.length,
          updated: d.updatedAt.toISOString().split('T')[0]
        }))
      })
    )

  dashCmd
    .command('show <dashboard-id>')
    .description('Show a dashboard configuration')
    .option('--format <format>', 'output format: table (default) or json', 'table')
    .action((dashboardId: string, opts: { format: string }) =>
      runAction(opts, ['table', 'json'], () => dashboardSummary(requireDashboard(dashboardId)))
    )

  dashCmd
    .command('create')
    .description('Create an empty dashboard')
    .option('-c, --connection <name-or-id>', 'connection name or ID (or set DBDESK_CONNECTION)')
    .requiredOption('-n, --name <name>', 'dashboard name')
    .option('-d, --description <text>', 'dashboard description')
    .option('--format <format>', 'output format: table (default) or json', 'table')
    .action((opts: { connection?: string; name: string; description?: string; format: string }) =>
      runAction(opts, ['table', 'json'], () => {
        const connectionId = resolveConnection(connectionRefOrEnv(opts.connection)).id
        return dashboardSummary(createDashboard(connectionId, opts.name, opts.description))
      })
    )

  dashCmd
    .command('delete <dashboard-id>')
    .description('Delete a dashboard')
    .option('--format <format>', 'output format: table (default) or json', 'table')
    .action((dashboardId: string, opts: { format: string }) =>
      runAction(opts, ['table', 'json'], () => {
        if (!deleteDashboard(dashboardId)) {
          throw new CliError('not-found', `Dashboard "${dashboardId}" not found.`)
        }
        return { removed: dashboardId, message: `Dashboard "${dashboardId}" deleted.` }
      })
    )

  dashCmd
    .command('export <dashboard-id>')
    .description('Export a dashboard to a declarative YAML file (pairs with apply)')
    .option('--format <format>', 'output format: yaml (default) or json', 'yaml')
    .action(async (dashboardId: string, opts: { format: string }) => {
      const raw = typeof opts.format === 'string' ? opts.format.toLowerCase() : 'yaml'
      const format = raw === 'json' ? 'json' : 'yaml'
      if (raw !== 'yaml' && raw !== 'json') {
        warn(`Unknown format "${opts.format}". Valid formats: yaml, json. Using yaml.`)
      }
      try {
        const dashboard = requireDashboard(dashboardId)
        const conn = getConnection(dashboard.connectionId)
        if (format === 'json') {
          writeData(dashboardSummary(dashboard), 'json')
        } else {
          console.log(dashboardToDoc(dashboard, conn?.name ?? dashboard.connectionId))
        }
      } catch (err) {
        process.exit(reportError(err, 'table'))
      }
    })

  const validateDoc = (file: string) => {
    const raw = file === '-' ? readFileSync(0, 'utf-8') : readFileSync(file, 'utf-8')
    const doc = parseDashboardDoc(raw)
    const connection = resolveConnection(doc.dashboard.connection)
    const { widgets, errors } = buildWidgets(doc.widgets)
    return { doc, connection, widgets, errors }
  }

  dashCmd
    .command('validate')
    .description('Validate a dashboard file without applying it')
    .requiredOption('-f, --file <path>', 'dashboard YAML file ("-" reads stdin)')
    .option('--format <format>', 'output format: table (default) or json', 'table')
    .action((opts: { file: string; format: string }) =>
      runAction(opts, ['table', 'json'], () => {
        let parsed: ReturnType<typeof validateDoc>
        try {
          parsed = validateDoc(opts.file)
        } catch (err) {
          throw new CliError('validation-failed', err instanceof Error ? err.message : String(err))
        }
        if (parsed.errors.length > 0) {
          throw new CliError('validation-failed', `${parsed.errors.length} problem(s) found:`, parsed.errors.join('\n'))
        }
        return {
          valid: true,
          dashboard: parsed.doc.dashboard.name,
          connection: parsed.connection.name,
          widgets: parsed.widgets.length,
          message: 'Dashboard file is valid.'
        }
      })
    )

  dashCmd
    .command('apply')
    .description('Create or update a dashboard from a declarative YAML file (see export)')
    .requiredOption('-f, --file <path>', 'dashboard YAML file ("-" reads stdin)')
    .option('-d, --dashboard <dashboard-id>', 'update this dashboard instead of matching by name')
    .option('--dry-run', 'print the plan without saving anything')
    .option('--format <format>', 'output format: table (default) or json', 'table')
    .action((opts: { file: string; dashboard?: string; dryRun?: boolean; format: string }) =>
      runAction(opts, ['table', 'json'], () => {
        let parsed: ReturnType<typeof validateDoc>
        try {
          parsed = validateDoc(opts.file)
        } catch (err) {
          throw new CliError('validation-failed', err instanceof Error ? err.message : String(err))
        }
        if (parsed.errors.length > 0) {
          throw new CliError('validation-failed', `${parsed.errors.length} problem(s) found:`, parsed.errors.join('\n'))
        }

        const { doc, connection, widgets } = parsed
        const existing = opts.dashboard
          ? requireDashboard(opts.dashboard)
          : listDashboards(connection.id).find((d) => d.name === doc.dashboard.name)

        const plan = {
          action: existing ? 'update' : 'create',
          dashboard: doc.dashboard.name,
          connection: connection.name,
          widgetsToSet: widgets.length,
          widgetsRemoved: existing ? existing.widgets.length : 0
        }

        if (opts.dryRun) {
          return { ...plan, dryRun: true, message: 'Dry run — nothing saved.' }
        }

        const layout = doc.dashboard.layout
          ? {
              columns: doc.dashboard.layout.columns ?? 12,
              rowHeight: doc.dashboard.layout.rowHeight ?? 48,
              margin: doc.dashboard.layout.margin ?? ([8, 8] as [number, number])
            }
          : (existing?.layout ?? { columns: 12, rowHeight: 48, margin: [8, 8] as [number, number] })

        const saved = existing
          ? saveDashboard({
              ...existing,
              name: doc.dashboard.name,
              description: doc.dashboard.description,
              layout,
              widgets,
              updatedAt: new Date()
            })
          : (() => {
              const created = createDashboard(connection.id, doc.dashboard.name, doc.dashboard.description)
              return saveDashboard({ ...created, layout, widgets, updatedAt: new Date() })
            })()

        return { ...dashboardSummary(saved), appliedAction: plan.action }
      })
    )

  dashCmd
    .command('add-widget')
    .description('Add a single widget to a dashboard (for files, prefer apply)')
    .option('-c, --connection <name-or-id>', 'connection name or ID (or set DBDESK_CONNECTION)')
    .requiredOption('-d, --dashboard <dashboard-id>', 'dashboard ID')
    .requiredOption('--type <type>', `widget type: ${WIDGET_TYPES.join(', ')}`)
    .requiredOption('--title <title>', 'widget title')
    .option('--query <sql>', 'inline read-only SQL query')
    .option('--query-id <id>', 'reference a saved query by ID')
    .option('--position <x,y,w,h>', 'grid position (default: 0,0,6,4)')
    .option('--settings <key=value...>', 'widget settings (repeatable: --settings a=1 --settings b=x)')
    .option('--format <format>', 'output format: table (default) or json', 'table')
    .action(
      (opts: {
        connection?: string
        dashboard: string
        type: string
        title: string
        query?: string
        queryId?: string
        position?: string
        settings?: string[]
        format: string
      }) =>
        runAction(opts, ['table', 'json'], () => {
          const dashboard = requireDashboard(opts.dashboard)
          const type = requireWidgetType(opts.type)

          if (opts.connection) {
            const connectionId = resolveConnection(connectionRefOrEnv(opts.connection)).id
            if (dashboard.connectionId !== connectionId) {
              throw new CliError(
                'validation-failed',
                `Dashboard belongs to a different connection.`,
                'Omit --connection or pass the dashboard\'s own connection.'
              )
            }
          }

          const { widgets, errors } = buildWidgets([
            { type, title: opts.title, query: opts.query, queryId: opts.queryId, position: opts.position, settings: parseSettings(opts.settings) }
          ])
          if (errors.length > 0) {
            throw new CliError('validation-failed', errors.join('\n'))
          }
          const widget = widgets[0] as Widget

          const updated = saveDashboard({
            ...dashboard,
            widgets: [...dashboard.widgets, widget],
            updatedAt: new Date()
          })
          return dashboardSummary(updated)
        })
    )

  dashCmd
    .command('remove-widget')
    .description('Remove a widget from a dashboard')
    .requiredOption('-d, --dashboard <dashboard-id>', 'dashboard ID')
    .requiredOption('-w, --widget <widget-id>', 'widget ID to remove')
    .option('--format <format>', 'output format: table (default) or json', 'table')
    .action((opts: { dashboard: string; widget: string; format: string }) =>
      runAction(opts, ['table', 'json'], () => {
        const dashboard = requireDashboard(opts.dashboard)
        const filtered = dashboard.widgets.filter((w) => w.id !== opts.widget)
        if (filtered.length === dashboard.widgets.length) {
          throw new CliError('not-found', `Widget "${opts.widget}" not found in dashboard.`)
        }
        return dashboardSummary(saveDashboard({ ...dashboard, widgets: filtered, updatedAt: new Date() }))
      })
    )

  dashCmd
    .command('update-widget')
    .description('Update a widget in a dashboard')
    .requiredOption('-d, --dashboard <dashboard-id>', 'dashboard ID')
    .requiredOption('-w, --widget <widget-id>', 'widget ID to update')
    .option('--title <title>', 'new widget title')
    .option('--query <sql>', 'new inline read-only SQL query')
    .option('--position <x,y,w,h>', 'new grid position')
    .option('--settings <key=value...>', 'merged into existing widget settings')
    .option('--format <format>', 'output format: table (default) or json', 'table')
    .action(
      (opts: {
        dashboard: string
        widget: string
        title?: string
        query?: string
        position?: string
        settings?: string[]
        format: string
      }) =>
        runAction(opts, ['table', 'json'], () => {
          const dashboard = requireDashboard(opts.dashboard)
          const index = dashboard.widgets.findIndex((w) => w.id === opts.widget)
          if (index === -1) {
            throw new CliError('not-found', `Widget "${opts.widget}" not found in dashboard.`)
          }
          const existing = dashboard.widgets[index] as Widget
          if (opts.query !== undefined && !isReadOnlyQuery(opts.query)) {
            throw new CliError('validation-failed', 'Widget queries must be read-only (SELECT/SHOW).')
          }
          const updated: Widget = {
            ...existing,
            title: opts.title ?? existing.title,
            customQuery: opts.query !== undefined ? opts.query : existing.customQuery,
            position: opts.position ? resolveWidgetPosition(opts.position) : existing.position,
            settings: opts.settings
              ? ({ ...existing.settings, ...parseSettings(opts.settings) } as WidgetSettings)
              : existing.settings
          }
          const next = [...dashboard.widgets]
          next[index] = updated
          return dashboardSummary(saveDashboard({ ...dashboard, widgets: next, updatedAt: new Date() }))
        })
    )
}
