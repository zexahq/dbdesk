import type { ConnectionProfile, DatabaseType } from '@dbdesk/shared/types'
import {
  useConnections,
  useCreateConnection,
  useDiscoverLocalDatabases,
  useExportConnections,
  useImportConnections
} from '@renderer/features/connections/queries/connections'
import { Button } from '@renderer/components/ui/button'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { toast } from '@renderer/shared/lib/toast'
import { Download, Plus, Search, Upload } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ConnectionCard } from './connection-card'
import { ConnectionDialog } from './connection-dialog'

export function ConnectionList() {
  const { data: connections, isLoading, isError, error } = useConnections()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingConnection, setEditingConnection] = useState<ConnectionProfile | null>(null)
  const [selectedDatabaseType, setSelectedDatabaseType] = useState<DatabaseType | null>(null)
  const createConnection = useCreateConnection()
  const exportConnections = useExportConnections()
  const importConnections = useImportConnections()
  const discoverLocal = useDiscoverLocalDatabases()

  const handleNewConnection = () => {
    setSelectedDatabaseType('postgres')
    setEditingConnection(null)
    setIsModalOpen(true)
  }

  const handleEditConnection = (profile: ConnectionProfile) => {
    setEditingConnection(profile)
    setSelectedDatabaseType(null)
    setIsModalOpen(true)
  }

  const handleModalOpenChange = (open: boolean) => {
    setIsModalOpen(open)
    if (!open) {
      setEditingConnection(null)
      setSelectedDatabaseType(null)
    }
  }

  const hasConnections = (connections?.length ?? 0) > 0
  const groupedConnections = useMemo(() => {
    const groups = new Map<string, ConnectionProfile[]>()
    for (const profile of connections ?? []) {
      const group = 'group' in profile.options ? profile.options.group?.trim() : ''
      const name = group || 'Ungrouped'
      groups.set(name, [...(groups.get(name) ?? []), profile])
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [connections])

  const handleDiscoverLocal = async () => {
    try {
      const discovered = await discoverLocal.mutateAsync()
      const existing = new Set(
        (connections ?? []).flatMap((profile) =>
          'host' in profile.options && 'database' in profile.options
            ? [`${profile.options.host}:${profile.options.port}/${profile.options.database}`]
            : []
        )
      )
      const newDatabases = discovered.filter(
        ({ options }) => !existing.has(`${options.host}:${options.port}/${options.database}`)
      )
      await Promise.all(
        newDatabases.map(({ name, options }) =>
          createConnection.mutateAsync({
            name,
            type: 'postgres',
            options: {
              ...options,
              group: 'Local',
              color: '#22c55e',
              environment: 'development'
            }
          })
        )
      )
      toast.success(
        newDatabases.length
          ? `Added ${newDatabases.length} local database${newDatabases.length === 1 ? '' : 's'}`
          : 'No new local databases found'
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Local discovery failed')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Connections</h2>
            <p className="text-sm text-muted-foreground">
              Manage database profiles and establish connections.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => void handleDiscoverLocal()}
              disabled={discoverLocal.isPending || createConnection.isPending}
            >
              <Search className="size-4" />
              Discover Local
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                void importConnections
                  .mutateAsync()
                  .then((profiles) => {
                    if (profiles.length) toast.success(`Imported ${profiles.length} connections`)
                  })
                  .catch((error) => toast.error(error.message))
              }
              disabled={importConnections.isPending}
            >
              <Upload className="size-4" />
              Import
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                void exportConnections
                  .mutateAsync()
                  .then((result) => {
                    if (result.exported) toast.success(`Exported ${result.exported} connections`)
                  })
                  .catch((error) => toast.error(error.message))
              }
              disabled={!hasConnections || exportConnections.isPending}
            >
              <Download className="size-4" />
              Export
            </Button>
            <Button className="cursor-pointer" onClick={handleNewConnection}>
              <Plus className="size-4" />
              New Connection
            </Button>
          </div>
        </div>
      </header>

      {isError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load connections: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      ) : hasConnections ? (
        <div className="space-y-5">
          {groupedConnections.map(([group, profiles], index) => (
            <section key={group} aria-labelledby={`connection-group-${index}`}>
              <h3
                id={`connection-group-${index}`}
                className="mb-2 text-sm font-medium text-muted-foreground"
              >
                {group} ({profiles.length})
              </h3>
              <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                {profiles.map((profile) => (
                  <ConnectionCard
                    key={profile.id}
                    profile={profile}
                    onEdit={handleEditConnection}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No connections yet. Create your first database profile to get started.
        </div>
      )}

      <ConnectionDialog
        open={isModalOpen}
        onOpenChange={handleModalOpenChange}
        connection={editingConnection}
        databaseType={selectedDatabaseType || undefined}
      />
    </div>
  )
}
