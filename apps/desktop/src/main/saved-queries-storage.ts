import type { SavedQueriesStorage, SavedQuery } from '@dbdesk/shared/types'
import { and, eq } from 'drizzle-orm'
import { getDb, savedQueries } from '@dbdesk/db'

const toSavedQuery = (row: typeof savedQueries.$inferSelect): SavedQuery => ({
  id: row.id,
  name: row.name,
  content: row.content,
  createdAt: new Date(row.createdAt),
  updatedAt: new Date(row.updatedAt),
})

export const saveQuery = async (
  connectionId: string,
  id: string,
  name: string,
  content: string,
): Promise<SavedQuery> => {
  const now = new Date()

  getDb()
    .insert(savedQueries)
    .values({
      connectionId,
      id,
      name,
      content,
      createdAt: now.getTime(),
      updatedAt: now.getTime(),
    })
    .run()

  return { id, name, content, createdAt: now, updatedAt: now }
}

export const updateQuery = async (
  connectionId: string,
  queryId: string,
  name: string,
  content: string,
): Promise<SavedQuery | undefined> => {
  const existing = getDb()
    .select()
    .from(savedQueries)
    .where(and(eq(savedQueries.connectionId, connectionId), eq(savedQueries.id, queryId)))
    .get()

  if (!existing) return undefined

  const now = new Date()

  getDb()
    .update(savedQueries)
    .set({ name, content, updatedAt: now.getTime() })
    .where(and(eq(savedQueries.connectionId, connectionId), eq(savedQueries.id, queryId)))
    .run()

  return {
    id: queryId,
    name,
    content,
    createdAt: new Date(existing.createdAt),
    updatedAt: now,
  }
}

export const deleteQuery = async (connectionId: string, queryId: string): Promise<void> => {
  getDb()
    .delete(savedQueries)
    .where(and(eq(savedQueries.connectionId, connectionId), eq(savedQueries.id, queryId)))
    .run()
}

export const loadQueries = async (connectionId: string): Promise<SavedQuery[]> => {
  const rows = getDb()
    .select()
    .from(savedQueries)
    .where(eq(savedQueries.connectionId, connectionId))
    .all()

  return rows.map(toSavedQuery)
}

export const loadAllQueries = async (): Promise<SavedQueriesStorage> => {
  const rows = getDb().select().from(savedQueries).all()
  const result: SavedQueriesStorage = {}

  for (const row of rows) {
    if (!result[row.connectionId]) {
      result[row.connectionId] = []
    }
    result[row.connectionId].push(toSavedQuery(row))
  }

  return result
}

export const deleteAllQueriesForConnection = async (connectionId: string): Promise<void> => {
  getDb().delete(savedQueries).where(eq(savedQueries.connectionId, connectionId)).run()
}
