import { registerAdapterHandlers } from './adapter-handlers'
import { registerAuthHandlers } from './auth-handlers'
import { registerCliHandlers } from './cli-handlers'
import { registerConnectionHandlers } from './connection-handlers'
import { registerDashboardHandlers } from './dashboard-handlers'
import { registerQueryHandlers } from './query-handlers'
import { registerSavedQueryHandlers } from './saved-query-handlers'
import { registerSchemaHandlers } from './schema-handlers'
import { registerTableHandlers } from './table-handlers'
import { registerUpdateHandlers } from './update-handlers'
import { registerWorkspaceHandlers } from './workspace-handlers'

export function registerAllIpcHandlers() {
  registerAdapterHandlers()
  registerAuthHandlers()
  registerCliHandlers()
  registerConnectionHandlers()
  registerDashboardHandlers()
  registerQueryHandlers()
  registerSchemaHandlers()
  registerTableHandlers()
  registerUpdateHandlers()
  registerWorkspaceHandlers()
  registerSavedQueryHandlers()
}
