import type { SQLAdapter, TableDataOptions, ExportTableOptions } from '@dbdesk/shared/types'
import { connectionManager } from '../connectionManager'
import { ConnectionError, ValidationError } from '../utils/errors'
import { typedHandle } from './typed-handle'

const ensureSQLAdapter = (connectionId: string): SQLAdapter => {
  const adapter = connectionManager.getSQLConnection(connectionId)
  if (!adapter) throw new ConnectionError(`Connection "${connectionId}" is not available`)
  if (typeof adapter.listSchemas !== 'function')
    throw new ValidationError('Requested operation requires a SQL adapter')
  return adapter
}

export function registerTableHandlers() {
  typedHandle(
    'table:data',
    async ({ connectionId, schema, table, limit, offset, sortRules, filters }) => {
      const adapter = ensureSQLAdapter(connectionId)
      const options: TableDataOptions = { schema, table, limit, offset }
      if (sortRules && sortRules.length > 0) options.sortRules = sortRules
      if (filters && filters.length > 0) options.filters = filters
      return adapter.fetchTableData(options)
    }
  )

  typedHandle('table:deleteRows', async ({ connectionId, schema, table, rows }) => {
    return ensureSQLAdapter(connectionId).deleteTableRows({ schema, table, rows })
  })

  typedHandle(
    'table:updateCell',
    async ({ connectionId, schema, table, columnToUpdate, newValue, row }) => {
      return ensureSQLAdapter(connectionId).updateTableCell({
        schema,
        table,
        columnToUpdate,
        newValue,
        row
      })
    }
  )

  typedHandle('table:insertRow', async ({ connectionId, schema, table, values }) => {
    return ensureSQLAdapter(connectionId).insertTableRow({ schema, table, values })
  })

  typedHandle('table:exportCSV', async ({ connectionId, schema, table, sortRules, filters }) => {
    const options: ExportTableOptions = { schema, table, sortRules, filters }
    return ensureSQLAdapter(connectionId).exportTableAsCSV(options)
  })

  typedHandle('table:exportSQL', async ({ connectionId, schema, table, sortRules, filters }) => {
    const options: ExportTableOptions = { schema, table, sortRules, filters }
    return ensureSQLAdapter(connectionId).exportTableAsSQL(options)
  })

  typedHandle('table:delete', async ({ connectionId, schema, table }) => {
    return ensureSQLAdapter(connectionId).deleteTable({ schema, table })
  })

  typedHandle('table:create', async ({ connectionId, schema, table, columns }) => {
    return ensureSQLAdapter(connectionId).createTable({ schema, table, columns })
  })
}
