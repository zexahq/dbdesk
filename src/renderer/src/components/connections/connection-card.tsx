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
import { useConnect, useDeleteConnection } from '@renderer/api/queries/connections'
import { useMemo } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { useNavigate } from '@tanstack/react-router'
import { useSqlWorkspaceStore } from '@renderer/store/sql-workspace-store'
import postgresImage from '../../assets/postgres.svg'

interface ConnectionCardProps {
  profile: ConnectionProfile
  onEdit?: (profile: ConnectionProfile) => void
}

const typeLabelMap: Record<ConnectionProfile['type'], { label: string; image: string }> = {
  postgres: { label: 'PostgreSQL', image: postgresImage },
  mysql: { label: 'MySQL', image: '' },
  mongodb: { label: 'MongoDB', image: '' },
  redis: { label: 'Redis', image: '' }
}

export function ConnectionCard({ profile, onEdit }: ConnectionCardProps) {
  const { mutateAsync: connect, isPending: isConnecting } = useConnect()
  const { mutateAsync: deleteConnection, isPending: isDeleting } = useDeleteConnection()
  const navigate = useNavigate()
  const { setCurrentConnection } = useSqlWorkspaceStore()

  const isBusy = isConnecting || isDeleting

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
          <Badge variant="secondary" className="flex items-center gap-2 px-2 py-1">
            <img
              src={typeLabelMap[profile.type].image}
              alt={typeLabelMap[profile.type].label}
              className="size-5 mr-2"
            />
            {typeLabelMap[profile.type].label}
          </Badge>
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
        <div className="grid grid-cols-2 gap-2">
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
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-2 w-full">
        <div className="flex items-center gap-2 w-full">
          <Button
            size="sm"
            variant="destructive"
            className="w-1/2"
            onClick={() => void handleDelete()}
            disabled={isBusy}
          >
            {isDeleting ? 'Deleting…' : 'Delete'}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="w-1/2"
            onClick={() => onEdit?.(profile)}
            disabled={isBusy}
          >
            Edit
          </Button>
        </div>
        <div className="flex justify-end gap-2 w-full">
          <Button
            size="sm"
            className="cursor-pointer w-1/2"
            onClick={handleConnect}
            disabled={isBusy}
          >
            {isConnecting ? 'Connecting…' : 'Connect'}
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
