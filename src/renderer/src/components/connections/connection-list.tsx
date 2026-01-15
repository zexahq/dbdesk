import type { ConnectionProfile, DatabaseType } from '@common/types'
import { useConnections } from '@renderer/api/queries/connections'
import { Button } from '@renderer/components/ui/button'
import { Skeleton } from '@renderer/components/ui/skeleton'
import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ConnectionCard } from './connection-card'
import { ConnectionDialog } from './connection-dialog'

export function ConnectionList() {
  const { data: connections, isLoading, isError, error } = useConnections()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingConnection, setEditingConnection] = useState<ConnectionProfile | null>(null)
  const [selectedDatabaseType, setSelectedDatabaseType] = useState<DatabaseType | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  const handleNewConnection = (type: DatabaseType) => {
    setSelectedDatabaseType(type)
    setEditingConnection(null)
    setIsModalOpen(true)
    setIsDropdownOpen(false)
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
          <div className="relative" ref={dropdownRef}>
            <Button className="cursor-pointer" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
              New Connection
              <ChevronDown className="size-4" />
            </Button>
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-md border bg-popover shadow-md z-50">
                <div className="p-1">
                  <button
                    className="w-full text-left px-3 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                    onClick={() => handleNewConnection('postgres')}
                  >
                    PostgreSQL
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => {
                      handleNewConnection('mysql')
                    }}
                  >
                    MySQL
                  </button>
                </div>
              </div>
            )}
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
        databaseType={selectedDatabaseType || undefined}
      />
    </div>
  )
}
