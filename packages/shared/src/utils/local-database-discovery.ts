export type LocalDatabaseEndpoint = {
  host: string
  port: number
  database: string
}

export const getLocalDatabaseKey = ({ port, database }: LocalDatabaseEndpoint) =>
  `${port}/${database}`

export const isLocalDatabaseHost = (host: string) =>
  host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.startsWith('/')

export const deduplicateLocalDatabases = <T extends LocalDatabaseEndpoint>(databases: T[]): T[] => {
  const seen = new Set<string>()
  return databases.filter((database) => {
    const key = getLocalDatabaseKey(database)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
