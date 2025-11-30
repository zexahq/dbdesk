import type { QueryResult } from '@common/types'
import { useMutation } from '@tanstack/react-query'
import { dbdeskClient } from '../../api/client'

export function useRunQuery(connectionId: string) {
  return useMutation({
    mutationFn: (query: string) => dbdeskClient.runQuery(connectionId, query),
    onSuccess: (_data: QueryResult) => {
      // Invalidate any dependent data if needed in the future
      // For now, no-op. Example:
      // queryClient.invalidateQueries({ queryKey: ['some-dependent-key', connectionId] })
    }
  })
}

// Placeholder hook until history is implemented in main process/storage
export function useQueryHistory(_connectionId: string) {
  return {
    data: [] as Array<{ id: string; query: string; ranAt: Date }>,
    isLoading: false,
    isError: false
  }
}
