import { useMutation } from '@tanstack/react-query'
import { dbdeskClient } from '../../api/client'

export function useRunQuery(connectionId: string) {
  return useMutation({
    mutationFn: ({
      query,
      options
    }: {
      query: string
      options?: { limit?: number; offset?: number }
    }) => dbdeskClient.runQuery(connectionId, query, options)
  })
}
