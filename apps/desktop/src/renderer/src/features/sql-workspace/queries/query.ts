import { useMutation } from '@tanstack/react-query'
import { dbdeskClient } from '@renderer/shared/api/client'

// Helper to detect DDL statements
const isDDLQuery = (query: string): boolean => {
  const upperQuery = query.trim().toUpperCase()
  return /^(CREATE|DROP|ALTER|TRUNCATE|RENAME)\s/.test(upperQuery)
}

export function useRunQuery(connectionId: string) {
  return useMutation({
    mutationFn: ({
      queries,
      options
    }: {
      queries: string[]
      options?: { limit?: number; offset?: number; includeTotalRowCount?: boolean }
    }) => dbdeskClient.runQuery(connectionId, queries, options),
    onSuccess: (_, variables, _ctx, client) => {
      // Invalidate schemas cache if any query is DDL
      if (variables.queries.some((q) => isDDLQuery(q))) {
        client.client.invalidateQueries({
          queryKey: ['schemasWithTables', connectionId]
        })
      }
    }
  })
}
