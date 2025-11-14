import type { ConnectionProfile } from '@common/types'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@renderer/components/ui/card'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { useConnect, useDeleteConnection, useDisconnect } from '@renderer/api/queries/connections'
import { useMemo } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { useNavigate } from '@tanstack/react-router'
import { useSqlWorkspaceStore } from '@renderer/store/sql-workspace-store'

interface ConnectionCardProps {
  profile: ConnectionProfile
  onEdit?: (profile: ConnectionProfile) => void
}

const typeLabelMap: Record<ConnectionProfile['type'], string> = {
  postgres: 'PostgreSQL',
  mysql: 'MySQL',
  mongodb: 'MongoDB',
  redis: 'Redis'
}

export function ConnectionCard({ profile, onEdit }: ConnectionCardProps) {
  const { mutateAsync: connect, isPending: isConnecting } = useConnect()
  const { mutateAsync: disconnect, isPending: isDisconnecting } = useDisconnect()
  const { mutateAsync: deleteConnection, isPending: isDeleting } = useDeleteConnection()
  const navigate = useNavigate()
  const { setCurrentConnection } = useSqlWorkspaceStore()

  const isBusy = isConnecting || isDisconnecting || isDeleting

  const lastConnectedLabel = useMemo(() => {
    if (!profile.lastConnectedAt) return 'Never connected'
    return `Last connected ${formatDistanceToNow(profile.lastConnectedAt, { addSuffix: true })}`
  }, [profile.lastConnectedAt])

  const handleConnect = async () => {
    await connect(profile.id, {
      onSuccess: () => {
        setCurrentConnection(profile.id)
        navigate({
          to: '/connections/$connectionId',
          params: { connectionId: profile.id }
        })
      }
    })
  }

  const handleDelete = async () => {
    const confirmed = window.confirm(`Delete connection "${profile.name}"? This cannot be undone.`)
    if (!confirmed) return

    await deleteConnection(profile.id)
  }

  return (
    <Card className="h-full">
      <CardHeader className="gap-1">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg font-semibold">{profile.name}</CardTitle>
          <Badge variant="secondary">{typeLabelMap[profile.type]}</Badge>
        </div>
        <CardDescription>{lastConnectedLabel}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <div>
          <p className="text-xs uppercase text-muted-foreground">Host</p>
          <p className="font-medium">
            {'host' in profile.options ? profile.options.host : '—'}
            {'port' in profile.options && profile.options.port ? `:${profile.options.port}` : ''}
          </p>
        </div>
        {'database' in profile.options && (
          <div>
            <p className="text-xs uppercase text-muted-foreground">Database</p>
            <p className="font-medium">{profile.options.database}</p>
          </div>
        )}
        {'user' in profile.options && (
          <div>
            <p className="text-xs uppercase text-muted-foreground">User</p>
            <p className="font-medium">{profile.options.user}</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="grid gap-2">
        <div className="flex gap-2">
          <Button size="sm" className="flex-1" onClick={handleConnect} disabled={isBusy}>
            {isConnecting ? 'Connecting…' : 'Connect'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => disconnect(profile.id)}
            disabled={isBusy}
          >
            {isDisconnecting ? 'Disconnecting…' : 'Disconnect'}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="flex-1"
            onClick={() => onEdit?.(profile)}
            disabled={isBusy}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="flex-1"
            onClick={() => void handleDelete()}
            disabled={isBusy}
          >
            {isDeleting ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
