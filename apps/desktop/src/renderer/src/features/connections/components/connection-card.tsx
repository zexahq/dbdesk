import type { ConnectionProfile } from '@dbdesk/shared/types'
import { dbdeskClient } from '@renderer/shared/api/client'
import {
  useConnect,
  useCreateConnection,
  useDeleteConnection
} from '@renderer/features/connections/queries/connections'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@renderer/components/ui/card'
import { useSqlWorkspaceStore } from '@renderer/features/sql-workspace/stores/sql-workspace-store'
import { useTabStore } from '@renderer/features/sql-workspace/stores/tab-store'
import { useNavigate } from '@tanstack/react-router'
import { formatDistanceToNow } from 'date-fns'
import { useMemo } from 'react'
import { toast } from '@renderer/shared/lib/toast'
import postgresImage from '@renderer/assets/postgres.svg'

interface ConnectionCardProps {
  profile: ConnectionProfile
  onEdit?: (profile: ConnectionProfile) => void
}

const typeLabelMap: Record<ConnectionProfile['type'], { label: string; image: string }> = {
  postgres: { label: 'PostgreSQL', image: postgresImage },
  mongodb: { label: 'MongoDB', image: '' },
  redis: { label: 'Redis', image: '' }
}

export function ConnectionCard({ profile, onEdit }: ConnectionCardProps) {
  const { mutateAsync: connect, isPending: isConnecting } = useConnect()
  const { mutateAsync: deleteConnection, isPending: isDeleting } = useDeleteConnection()
  const { mutateAsync: createConnection, isPending: isDuplicating } = useCreateConnection()
  const navigate = useNavigate()
  const setCurrentConnection = useSqlWorkspaceStore((s) => s.setCurrentConnection)
  const reset = useTabStore((s) => s.reset)
  const loadFromSerialized = useTabStore((s) => s.loadFromSerialized)

  const isBusy = isConnecting || isDeleting || isDuplicating
  const environment = 'environment' in profile.options ? profile.options.environment : undefined
  const color = 'color' in profile.options ? profile.options.color : undefined
  const tags = 'tags' in profile.options ? profile.options.tags : undefined

  const lastConnectedLabel = useMemo(() => {
    if (!profile.lastConnectedAt) return 'Never connected'
    return `Last connected ${formatDistanceToNow(profile.lastConnectedAt, { addSuffix: true })}`
  }, [profile.lastConnectedAt])

  const handleConnect = async () => {
    await connect(profile.id, {
      onSuccess: async () => {
        setCurrentConnection(profile.id)

        try {
          const savedWorkspace = await dbdeskClient.loadWorkspace(profile.id)
          if (savedWorkspace) {
            loadFromSerialized(savedWorkspace.tabs, savedWorkspace.activeTabId)
          } else {
            reset()
          }
        } catch (error) {
          console.warn('Failed to load workspace, using defaults:', error)
          reset()
        }

        navigate({
          to: '/$connectionId',
          params: { connectionId: profile.id }
        })
      },
      onError: () => {
        toast.error(`Failed to connect to "${profile.name}"`)
      }
    })
  }

  const handleDelete = async () => {
    const confirmed = window.confirm(`Delete connection "${profile.name}"? This cannot be undone.`)
    if (!confirmed) return

    await deleteConnection(profile.id)
  }

  const handleDuplicate = async () => {
    await createConnection({
      name: `${profile.name} copy`,
      type: profile.type,
      options: profile.options
    })
    toast.success(`Duplicated "${profile.name}"`)
  }

  return (
    <Card
      className="h-full gap-3 py-3"
      style={color ? { borderLeft: `4px solid ${color}` } : undefined}
    >
      <CardHeader className="gap-1 px-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="truncate text-base font-semibold">{profile.name}</CardTitle>
          <Badge variant="secondary" className="flex shrink-0 items-center gap-1 px-2 py-1">
            <img
              src={typeLabelMap[profile.type].image}
              alt={typeLabelMap[profile.type].label}
              className="size-4"
            />
            {environment ?? typeLabelMap[profile.type].label}
          </Badge>
        </div>
        <CardDescription className="truncate">
          {'host' in profile.options ? profile.options.host : '—'}
          {'port' in profile.options && profile.options.port ? `:${profile.options.port}` : ''}
          {'database' in profile.options ? ` / ${profile.options.database}` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-5 items-center gap-1 px-4 text-xs text-muted-foreground">
        <span>{lastConnectedLabel}</span>
        {tags?.map((tag) => (
          <Badge key={tag} variant="outline" className="px-1.5 py-0 text-[10px]">
            {tag}
          </Badge>
        ))}
      </CardContent>
      <CardFooter className="grid grid-cols-4 gap-2 px-4">
        <Button size="sm" onClick={handleConnect} disabled={isBusy}>
          {isConnecting ? 'Connecting…' : 'Connect'}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => onEdit?.(profile)} disabled={isBusy}>
          Edit
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void handleDuplicate()}
          disabled={isBusy}
        >
          {isDuplicating ? 'Copying…' : 'Duplicate'}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => void handleDelete()}
          disabled={isBusy}
        >
          {isDeleting ? 'Deleting…' : 'Delete'}
        </Button>
      </CardFooter>
    </Card>
  )
}
