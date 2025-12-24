import { useMutation } from '@tanstack/react-query'
import { dbdeskClient } from '../../api/client'

export function useRunQuery(connectionId: string) {
  return useMutation({
    mutationFn: (query: string) => dbdeskClient.runQuery(connectionId, query)
  })
}
