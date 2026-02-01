import { useMutation } from '@tanstack/react-query'
import { dbdeskClient } from '../../api/client'

// Helper to detect DDL statements
const isDDLQuery = (query: string): boolean => {
  const upperQuery = query.trim().toUpperCase()
  return /^(CREATE|DROP|ALTER|TRUNCATE|RENAME)\s/.test(upperQuery)
}

export function useRunQuery(connectionId: string) {
  return useMutation({
    mutationFn: ({
      query,
      options
    }: {
      query: string
      options?: { limit?: number; offset?: number }
    }) => dbdeskClient.runQuery(connectionId, query, options),
    onSuccess: (_, variables, _ctx,  client) => {
      // Invalidate schemas cache if DDL query (CREATE, DROP, ALTER, etc.)
      if (isDDLQuery(variables.query)) {
        client.client.invalidateQueries({
          queryKey: ['schemasWithTables', connectionId]
        })
      }
    }
  })
}
