import type { SavedQueriesStorage, SavedQuery } from '@common/types'
import { app } from 'electron'
import { promises as fs } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

const QUERIES_FILENAME = 'saved-queries.json'

type StoredQuery = Omit<SavedQuery, 'createdAt' | 'updatedAt'> & {
  createdAt: string
  updatedAt: string
}

type StoredQueriesStorage = {
  [connectionId: string]: StoredQuery[]
}

const getSavedQueriesStoragePath = (): string => {
  try {
    if (app && typeof app.getPath === 'function') {
      return join(app.getPath('userData'), QUERIES_FILENAME)
    }
  } catch {
    // ignore and fall back
  }

  const base = process.env.DB_DESK_USER_DATA ?? homedir()
  return join(base, '.dbdesk', QUERIES_FILENAME)
}

const serializeQuery = (query: SavedQuery): StoredQuery => ({
  ...query,
  createdAt: query.createdAt.toISOString(),
  updatedAt: query.updatedAt.toISOString()
})

const deserializeQuery = (stored: StoredQuery): SavedQuery => ({
  ...stored,
  createdAt: new Date(stored.createdAt),
  updatedAt: new Date(stored.updatedAt)
})

const readQueriesFromDisk = async (): Promise<StoredQueriesStorage> => {
  const filePath = getSavedQueriesStoragePath()

  try {
    const content = await fs.readFile(filePath, 'utf8')
    if (content.trim() === '') {
      return {}
    }

    return JSON.parse(content) as StoredQueriesStorage
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {}
    }

    if (error instanceof SyntaxError) {
      console.warn(`Saved queries storage file is corrupted, resetting: ${error.message}`)
      return {}
    }

    throw error
  }
}

const writeQueriesToDisk = async (queries: StoredQueriesStorage): Promise<void> => {
  const filePath = getSavedQueriesStoragePath()
  await fs.mkdir(dirname(filePath), { recursive: true }).catch(() => {})
  await fs.writeFile(filePath, JSON.stringify(queries, null, 2), 'utf8')
}

export const saveQuery = async (
  connectionId: string,
  id: string,
  name: string,
  content: string
): Promise<SavedQuery> => {
  const queries = await readQueriesFromDisk()
  const now = new Date()

  const query: SavedQuery = {
    id,
    name,
    content,
    createdAt: now,
    updatedAt: now
  }

  if (!queries[connectionId]) {
    queries[connectionId] = []
  }

  queries[connectionId]!.push(serializeQuery(query))
  await writeQueriesToDisk(queries)

  return query
}

export const updateQuery = async (
  connectionId: string,
  queryId: string,
  name: string,
  content: string
): Promise<SavedQuery | undefined> => {
  const queries = await readQueriesFromDisk()
  const connectionQueries = queries[connectionId]

  if (!connectionQueries) {
    return undefined
  }

  const index = connectionQueries.findIndex((q) => q.id === queryId)
  if (index === -1) {
    return undefined
  }

  const now = new Date()
  const updated: StoredQuery = {
    ...connectionQueries[index]!,
    name,
    content,
    updatedAt: now.toISOString()
  }

  connectionQueries[index] = updated
  await writeQueriesToDisk(queries)

  return deserializeQuery(updated)
}

export const deleteQuery = async (connectionId: string, queryId: string): Promise<void> => {
  const queries = await readQueriesFromDisk()

  if (queries[connectionId]) {
    queries[connectionId] = queries[connectionId]!.filter((q) => q.id !== queryId)
    await writeQueriesToDisk(queries)
  }
}

export const loadQueries = async (connectionId: string): Promise<SavedQuery[]> => {
  const queries = await readQueriesFromDisk()
  const connectionQueries = queries[connectionId] || []

  return connectionQueries.map((q) => deserializeQuery(q))
}

export const loadAllQueries = async (): Promise<SavedQueriesStorage> => {
  const storedQueries = await readQueriesFromDisk()
  const queries: SavedQueriesStorage = {}

  for (const [connectionId, storedQueryList] of Object.entries(storedQueries)) {
    queries[connectionId] = storedQueryList.map((q) => deserializeQuery(q))
  }

  return queries
}

export const deleteAllQueriesForConnection = async (connectionId: string): Promise<void> => {
  const queries = await readQueriesFromDisk()
  delete queries[connectionId]
  await writeQueriesToDisk(queries)
}
