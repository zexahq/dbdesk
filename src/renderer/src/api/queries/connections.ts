import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dbdeskClient } from '../../api/client'
import type { ConnectionProfile, DatabaseType, DBConnectionOptions } from '@common/types'

const keys = {
  connections: ['connections'] as const
}

export function useConnections() {
  return useQuery<ConnectionProfile[]>({
    queryKey: keys.connections,
    queryFn: () => dbdeskClient.listConnections()
  })
}

export function useConnection(connectionId: string) {
  return useQuery<ConnectionProfile>({
    queryKey: [...keys.connections, connectionId],
    queryFn: () => dbdeskClient.getConnection(connectionId),
    enabled: !!connectionId
  })
}

export function useCreateConnection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; type: DatabaseType; options: DBConnectionOptions }) =>
      dbdeskClient.createConnection(input.name, input.type, input.options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.connections })
    }
  })
}

export function useConnect() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (connectionId: string) => dbdeskClient.connect(connectionId),
    onSuccess: () => {
      // Refresh connections to reflect status changes like lastConnectedAt
      queryClient.invalidateQueries({ queryKey: keys.connections })
    }
  })
}

export function useDisconnect() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (connectionId: string) => dbdeskClient.disconnect(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.connections })
    }
  })
}

export function useDeleteConnection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (connectionId: string) => dbdeskClient.deleteConnection(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.connections })
    }
  })
}
