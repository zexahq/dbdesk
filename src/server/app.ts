import type {
  DBConnectionOptions,
  DatabaseType,
  DeleteTableRowsOptions,
  TableDataOptions,
  UpdateTableCellOptions
} from '@common/types'
import express, { type NextFunction, type Request, type Response } from 'express'
import { listRegisteredAdapters } from '../main/adapters'
import { ConnectionManager } from '../main/connectionManager'
import { deleteQuery, loadQueries, saveQuery, updateQuery } from '../main/saved-queries-storage'
import { deleteWorkspace, loadWorkspace, saveWorkspace } from '../main/workspace-storage'

const app = express()

// Middleware
app.use(express.json())

// Note: error handler moved to bottom so it runs after route handlers

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true })
})

// ============================================================================
// Adapters API
// ============================================================================

app.get('/api/adapters', (_req: Request, res: Response) => {
  const adapters = listRegisteredAdapters()
  res.json(adapters)
})

// ============================================================================
// Connections API
// ============================================================================

app.get('/api/connections', (_req: Request, res: Response) => {
  const manager = ConnectionManager.getInstance()
  const profiles = manager.listProfiles()
  res.json(profiles)
})

app.post('/api/connections', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, type, options } = req.body as {
      name: string
      type: DatabaseType
      options: DBConnectionOptions
    }

    if (!name || !type || !options) {
      res.status(400).json({ error: 'Missing required fields: name, type, options' })
      return
    }

    const manager = ConnectionManager.getInstance()
    const profile = manager.createProfile(name, type, options)
    res.status(201).json(profile)
  } catch (err) {
    next(err)
  }
})

app.get('/api/connections/:connectionId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const manager = ConnectionManager.getInstance()
    const profile = manager.getProfile(req.params.connectionId)

    if (!profile) {
      res.status(404).json({ error: 'Connection not found' })
      return
    }

    res.json(profile)
  } catch (err) {
    next(err)
  }
})

app.put('/api/connections/:connectionId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, type, options } = req.body as {
      name: string
      type: DatabaseType
      options: DBConnectionOptions
    }

    if (!name || !type || !options) {
      res.status(400).json({ error: 'Missing required fields: name, type, options' })
      return
    }

    const manager = ConnectionManager.getInstance()
    const profile = manager.updateProfile(req.params.connectionId, name, type, options)
    res.json(profile)
  } catch (err) {
    next(err)
  }
})

app.delete('/api/connections/:connectionId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const manager = ConnectionManager.getInstance()
    manager.deleteProfile(req.params.connectionId)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

app.post(
  '/api/connections/:connectionId/connect',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const manager = ConnectionManager.getInstance()
      const profile = manager.getProfile(req.params.connectionId)

      if (!profile) {
        res.status(404).json({ error: 'Connection not found' })
        return
      }

      await manager.createConnection(req.params.connectionId, profile.type, profile.options)
      res.json({ success: true, connectionId: req.params.connectionId })
    } catch (err) {
      next(err)
    }
  }
)

app.post(
  '/api/connections/:connectionId/disconnect',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const manager = ConnectionManager.getInstance()
      await manager.disconnectConnection(req.params.connectionId)
      res.json({ success: true })
    } catch (err) {
      next(err)
    }
  }
)

// ============================================================================
// Query API
// ============================================================================

app.post(
  '/api/connections/:connectionId/query',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = req.body as { query: string }

      if (!query) {
        res.status(400).json({ error: 'Missing required field: query' })
        return
      }

      const manager = ConnectionManager.getInstance()
      const adapter = manager.getConnection(req.params.connectionId)

      if (!adapter) {
        res.status(404).json({ error: 'Connection not found or not connected' })
        return
      }

      const result = await adapter.runQuery(query)
      res.json(result)
    } catch (err) {
      next(err)
    }
  }
)

// ============================================================================
// Schema/Tables API
// ============================================================================

app.get(
  '/api/connections/:connectionId/schemas',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const manager = ConnectionManager.getInstance()
      const adapter = manager.getSQLConnection(req.params.connectionId)

      if (!adapter) {
        res.status(404).json({ error: 'Connection not found or not a SQL adapter' })
        return
      }

      const schemas = await adapter.listSchemas()
      res.json(schemas)
    } catch (err) {
      next(err)
    }
  }
)

app.get(
  '/api/connections/:connectionId/schemas/:schema/tables',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { schema } = req.params
      const manager = ConnectionManager.getInstance()
      const adapter = manager.getSQLConnection(req.params.connectionId)

      if (!adapter) {
        res.status(404).json({ error: 'Connection not found or not a SQL adapter' })
        return
      }

      const tables = await adapter.listTables(schema)
      res.json(tables)
    } catch (err) {
      next(err)
    }
  }
)

app.get(
  '/api/connections/:connectionId/schemas-with-tables',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const manager = ConnectionManager.getInstance()
      const adapter = manager.getSQLConnection(req.params.connectionId)

      if (!adapter) {
        res.status(404).json({ error: 'Connection not found or not a SQL adapter' })
        return
      }

      const schemas = await adapter.listSchemaWithTables()
      res.json(schemas)
    } catch (err) {
      next(err)
    }
  }
)

app.get(
  '/api/connections/:connectionId/schemas/:schema/tables/:table/introspect',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { schema, table } = req.params
      const manager = ConnectionManager.getInstance()
      const adapter = manager.getSQLConnection(req.params.connectionId)

      if (!adapter) {
        res.status(404).json({ error: 'Connection not found or not a SQL adapter' })
        return
      }

      const info = await adapter.introspectTable(schema, table)
      res.json(info)
    } catch (err) {
      next(err)
    }
  }
)

app.post(
  '/api/connections/:connectionId/schemas/:schema/tables/:table/data',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Ensure schema/table are provided (prefer URL params and merge with body options)
      const schema = req.params.schema
      const table = req.params.table

      if (!schema || !table) {
        res.status(400).json({ error: 'Missing schema or table in URL' })
        return
      }

      const options = { ...(req.body || {}), schema, table } as TableDataOptions
      const manager = ConnectionManager.getInstance()
      const adapter = manager.getSQLConnection(req.params.connectionId)

      if (!adapter) {
        res.status(404).json({ error: 'Connection not found or not a SQL adapter' })
        return
      }

      const data = await adapter.fetchTableData(options)
      res.json(data)
    } catch (err) {
      next(err)
    }
  }
)

// ============================================================================
// Data Modification API
// ============================================================================

app.post(
  '/api/connections/:connectionId/schemas/:schema/tables/:table/rows/delete',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { schema, table } = req.params
      const { rows } = req.body as { rows: unknown[] }

      if (!rows) {
        res.status(400).json({ error: 'Missing required field: rows' })
        return
      }

      const manager = ConnectionManager.getInstance()
      const adapter = manager.getSQLConnection(req.params.connectionId)

      if (!adapter) {
        res.status(404).json({ error: 'Connection not found or not a SQL adapter' })
        return
      }

      const options: DeleteTableRowsOptions = { schema, table, rows: rows as any }
      const result = await adapter.deleteTableRows(options)
      res.json(result)
    } catch (err) {
      next(err)
    }
  }
)

app.post(
  '/api/connections/:connectionId/schemas/:schema/tables/:table/cell',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { schema, table } = req.params
      const { columnToUpdate, newValue, row } = req.body as {
        columnToUpdate: string
        newValue: unknown
        row: unknown
      }

      if (!columnToUpdate || newValue === undefined || !row) {
        res.status(400).json({ error: 'Missing required fields: columnToUpdate, newValue, row' })
        return
      }

      const manager = ConnectionManager.getInstance()
      const adapter = manager.getSQLConnection(req.params.connectionId)

      if (!adapter) {
        res.status(404).json({ error: 'Connection not found or not a SQL adapter' })
        return
      }

      const options: UpdateTableCellOptions = { schema, table, columnToUpdate, newValue, row }
      const result = await adapter.updateTableCell(options)
      res.json(result)
    } catch (err) {
      next(err)
    }
  }
)

// ============================================================================
// Workspace API
// ============================================================================

app.get(
  '/api/connections/:connectionId/workspace',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workspace = await loadWorkspace(req.params.connectionId)
      res.json(workspace)
    } catch (err) {
      next(err)
    }
  }
)

app.post(
  '/api/connections/:connectionId/workspace',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workspace = req.body
      await saveWorkspace(workspace)
      res.json({ success: true })
    } catch (err) {
      next(err)
    }
  }
)

app.delete(
  '/api/connections/:connectionId/workspace',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deleteWorkspace(req.params.connectionId)
      res.json({ success: true })
    } catch (err) {
      next(err)
    }
  }
)

// ============================================================================
// Saved Queries API
// ============================================================================

app.get(
  '/api/connections/:connectionId/queries',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const queries = await loadQueries(req.params.connectionId)
      res.json(queries)
    } catch (err) {
      next(err)
    }
  }
)

app.post(
  '/api/connections/:connectionId/queries',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, content } = req.body as { name: string; content: string }

      if (!name || !content) {
        res.status(400).json({ error: 'Missing required fields: name, content' })
        return
      }

      const query = await saveQuery(req.params.connectionId, name, content)
      res.status(201).json(query)
    } catch (err) {
      next(err)
    }
  }
)

app.put(
  '/api/connections/:connectionId/queries/:queryId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, content } = req.body as { name: string; content: string }

      if (!name || !content) {
        res.status(400).json({ error: 'Missing required fields: name, content' })
        return
      }

      const query = await updateQuery(req.params.connectionId, req.params.queryId, name, content)
      res.json(query)
    } catch (err) {
      next(err)
    }
  }
)

app.delete(
  '/api/connections/:connectionId/queries/:queryId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deleteQuery(req.params.connectionId, req.params.queryId)
      res.json({ success: true })
    } catch (err) {
      next(err)
    }
  }
)

// Error handler middleware (placed after routes so it catches errors)
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('API Error:', err)
  const message = err instanceof Error ? err.message : 'Internal server error'
  res.status(500).json({ error: message })
})

export default app
