import { useMutation, useQueryClient } from '@tanstack/react-query'
import { dbdeskClient } from '@renderer/shared/api/client'

// Helper to detect DDL statements
const isDDLQuery = (query: string): boolean => {
  const upperQuery = query.trim().toUpperCase()
  return /^(CREATE|DROP|ALTER|TRUNCATE|RENAME)\s/.test(upperQuery)
}

export function useRunQuery(connectionId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      query,
      options
    }: {
      query: string
      options?: { limit?: number; offset?: number; queryId?: string }
    }) => dbdeskClient.runQuery(connectionId, query, options),
    onSuccess: (_, variables) => {
      // Invalidate schemas cache if DDL query (CREATE, DROP, ALTER, etc.)
      if (isDDLQuery(variables.query)) {
        queryClient.invalidateQueries({
          queryKey: ['schemasWithTables', connectionId]
        })
      }
    }
  })
}

export function useCancelQuery(connectionId: string) {
  return useMutation({
    mutationFn: (queryId: string) => dbdeskClient.cancelQuery(connectionId, queryId)
  })
}
