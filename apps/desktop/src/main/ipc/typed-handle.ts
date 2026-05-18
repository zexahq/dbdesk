import type { IpcContract } from '@dbdesk/shared/ipc'
import {
  connectionIdentifierSchema,
  createConnectionSchema,
  createTableInputSchema,
  dashboardConfigSchema,
  dashboardIdentifierSchema,
  deleteQueryInputSchema,
  deleteRowsInputSchema,
  exportDashboardsSchema,
  exportTableInputSchema,
  importDashboardsSchema,
  insertRowInputSchema,
  persistDashboardSchema,
  queryInputSchema,
  saveQueryInputSchema,
  schemaInputSchema,
  schemaIntrospectInputSchema,
  tableDataInputSchema,
  updateCellInputSchema,
  updateConnectionSchema,
  updateQueryInputSchema,
  workspaceInputSchema,
} from '@dbdesk/shared/schemas'
import { ipcMain } from 'electron'
import type { ZodType } from 'zod'
import { sanitizeError, ValidationError } from '../utils/errors'

// ── Schema map ──
// Maps channels that carry a payload to their Zod schema.
// Channels with `payload: void` (adapters:list, connections:list)
// are intentionally omitted—no validation needed.

const payloadSchemas: Partial<Record<keyof IpcContract, ZodType>> = {
  'connections:get': connectionIdentifierSchema,
  'connections:create': createConnectionSchema,
  'connections:update': updateConnectionSchema,
  'connections:connect': connectionIdentifierSchema,
  'connections:disconnect': connectionIdentifierSchema,
  'connections:delete': connectionIdentifierSchema,
  'query:run': queryInputSchema,
  'schema:list': connectionIdentifierSchema,
  'schema:tables': schemaInputSchema,
  'schema:listWithTables': connectionIdentifierSchema,
  'schema:introspect': schemaIntrospectInputSchema,
  'table:data': tableDataInputSchema,
  'table:deleteRows': deleteRowsInputSchema,
  'table:updateCell': updateCellInputSchema,
  'table:insertRow': insertRowInputSchema,
  'table:exportCSV': exportTableInputSchema,
  'table:exportSQL': exportTableInputSchema,
  'table:delete': schemaIntrospectInputSchema,
  'table:create': createTableInputSchema,
  'workspace:load': connectionIdentifierSchema,
  'workspace:save': workspaceInputSchema,
  'workspace:delete': connectionIdentifierSchema,
  'queries:save': saveQueryInputSchema,
  'queries:load': connectionIdentifierSchema,
  'queries:delete': deleteQueryInputSchema,
  'queries:update': updateQueryInputSchema,
  'dashboards:load': connectionIdentifierSchema,
  'dashboards:get': dashboardIdentifierSchema,
  'dashboards:save': dashboardConfigSchema,
  'dashboards:delete': dashboardIdentifierSchema,
  'dashboards:persist': persistDashboardSchema,
  'dashboards:export': exportDashboardsSchema,
  'dashboards:import': importDashboardsSchema,
}

/**
 * Type-safe IPC handler registration with automatic Zod validation.
 *
 * - If a Zod schema exists for the channel, the payload is parsed before
 *   the handler runs. A validation failure throws a `ValidationError`.
 * - Errors are sanitized before being sent back to the renderer.
 */
export function typedHandle<K extends keyof IpcContract>(
  channel: K,
  handler: (payload: IpcContract[K]['payload']) => Promise<IpcContract[K]['result']>,
): void {
  const schema = payloadSchemas[channel]

  ipcMain.handle(channel, async (_event, rawPayload: unknown) => {
    try {
      let payload = rawPayload as IpcContract[K]['payload']

      if (schema) {
        const result = schema.safeParse(rawPayload)
        if (!result.success) {
          const messages = result.error.issues
            .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
            .join('; ')
          throw new ValidationError(messages || 'Invalid input')
        }
        payload = result.data as IpcContract[K]['payload']
      }

      return await handler(payload)
    } catch (error) {
      console.error(`[IPC:${channel}]`, error)
      const sanitized = sanitizeError(error)
      const err = new Error(sanitized.message)
      err.name = sanitized.name
      throw err
    }
  })
}
