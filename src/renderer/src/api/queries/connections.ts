import type { ConnectionProfile, DatabaseType, DBConnectionOptions } from '@common/types'
import { useMutation, useQuery } from '@tanstack/react-query'
import { dbdeskClient } from '../../api/client'

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
  return useMutation({
    mutationFn: (input: { name: string; type: DatabaseType; options: DBConnectionOptions }) =>
      dbdeskClient.createConnection(input.name, input.type, input.options),
    onSuccess: (_result, _variables, _ctx, client) => {
      client.client.invalidateQueries({ queryKey: keys.connections })
    }
  })
}

export function useUpdateConnection() {
  return useMutation({
    mutationFn: (input: {
      connectionId: string
      name: string
      type: DatabaseType
      options: DBConnectionOptions
    }) => dbdeskClient.updateConnection(input.connectionId, input.name, input.type, input.options),
    onSuccess: (_result, _variables, _ctx, client) => {
      client.client.invalidateQueries({ queryKey: keys.connections })
    }
  })
}

export function useConnect() {
  return useMutation({
    mutationFn: (connectionId: string) => dbdeskClient.connect(connectionId),
    onSuccess: (_result, _variables, _ctx, client) => {
      // Refresh connections to reflect status changes like lastConnectedAt
      client.client.invalidateQueries({ queryKey: keys.connections })
    }
  })
}

export function useDisconnect() {
  return useMutation({
    mutationFn: (connectionId: string) => dbdeskClient.disconnect(connectionId),
    onSuccess: (_result, _variables, _ctx, client) => {
      client.client.invalidateQueries({ queryKey: keys.connections })
    }
  })
}

export function useDeleteConnection() {
  return useMutation({
    mutationFn: (connectionId: string) => dbdeskClient.deleteConnection(connectionId),
    onSuccess: (_result, _variables, _ctx, client) => {
      client.client.invalidateQueries({ queryKey: keys.connections })
    }
  })
}
