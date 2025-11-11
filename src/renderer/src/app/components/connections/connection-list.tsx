import { useState } from 'react'
import type { ConnectionProfile } from '@common/types'
import { useConnections } from '@renderer/api/queries/connections'
import { Button } from '@renderer/components/ui/button'
import { Separator } from '@renderer/components/ui/separator'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { ConnectionCard } from './connection-card'
import { ConnectionDialog } from './connection-dialog'

export function ConnectionList() {
  const { data: connections, isLoading, isError, error } = useConnections()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingConnection, setEditingConnection] = useState<ConnectionProfile | null>(null)

  const handleNewConnection = () => {
    setEditingConnection(null)
    setIsModalOpen(true)
  }

  const handleEditConnection = (profile: ConnectionProfile) => {
    setEditingConnection(profile)
    setIsModalOpen(true)
  }

  const handleModalOpenChange = (open: boolean) => {
    setIsModalOpen(open)
    if (!open) {
      setEditingConnection(null)
    }
  }

  const hasConnections = (connections?.length ?? 0) > 0

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
          <Button onClick={handleNewConnection}>New Connection</Button>
        </div>
      </header>

      <Separator />

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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {connections?.map((profile) => (
            <ConnectionCard key={profile.id} profile={profile} onEdit={handleEditConnection} />
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
      />
    </div>
  )
}
