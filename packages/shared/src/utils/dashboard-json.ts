import type { DashboardConfig } from '@dbdesk/shared/types'

/**
 * The full JSON document persisted in the `dashboards.config_json` column,
 * kept in tandem with the decomposed columns (dashboardId, connectionId,
 * userId, name, description, layoutJson, widgetsJson). Columns stay
 * authoritative for identity/linking; the document is preferred for content.
 */
export function buildDashboardConfigJson(
  dashboard: DashboardConfig,
  createdAt: Date,
  updatedAt: Date
): string {
  return JSON.stringify({
    dashboardId: dashboard.dashboardId,
    connectionId: dashboard.connectionId,
    userId: dashboard.userId ?? undefined,
    name: dashboard.name,
    description: dashboard.description ?? undefined,
    layout: dashboard.layout,
    widgets: dashboard.widgets,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString()
  })
}
