import { createFileRoute } from '@tanstack/react-router'
import { useConnection } from '@renderer/features/connections/queries/connections'
import { SqlWorkspace } from '@renderer/features/sql-workspace/components/sql-workspace'
import {
  useDashboardStore
} from '@renderer/features/sql-workspace/stores/dashboard-store'
import { useSqlWorkspaceStore } from '@renderer/features/sql-workspace/stores/sql-workspace-store'
import { useEffect } from 'react'

export const Route = createFileRoute('/$connectionId')({
  component: ConnectionPage
})

function ConnectionPage() {
  const { connectionId } = Route.useParams()
  const { data: profile, isLoading } = useConnection(connectionId)
  const currentDashboard = useDashboardStore((s) => s.currentDashboard)
  const setCurrentDashboard = useDashboardStore((s) => s.setCurrentDashboard)
  const persistDashboard = useDashboardStore((s) => s.persistDashboard)
  const setCurrentConnection = useSqlWorkspaceStore((s) => s.setCurrentConnection)

  useEffect(() => {
    setCurrentConnection(connectionId)
  }, [connectionId, setCurrentConnection])

  useEffect(() => {
    if (!currentDashboard || currentDashboard.connectionId === connectionId) {
      return
    }

    void persistDashboard(currentDashboard.dashboardId).catch((error) => {
      console.error('Failed to persist dashboard during connection switch:', error)
    })

    setCurrentDashboard(null)
  }, [connectionId, currentDashboard, persistDashboard, setCurrentDashboard])

  if (isLoading) {
    return <div className="p-6">Loading connection…</div>
  }

  if (!profile) {
    return <div className="p-6">Connection not found.</div>
  }

  const isSql = profile.type === 'postgres'

  if (isSql) {
    return <SqlWorkspace profile={profile} />
  }

  // Non-SQL placeholders
  if (profile.type === 'mongodb') {
    return (
      <div className="p-6 space-y-2">
        <h1 className="text-2xl font-semibold">MongoDB</h1>
        <p className="text-muted-foreground">Connection: {profile.name}</p>
        <p>MongoDB UI coming soon.</p>
      </div>
    )
  }

  if (profile.type === 'redis') {
    return (
      <div className="p-6 space-y-2">
        <h1 className="text-2xl font-semibold">Redis</h1>
        <p className="text-muted-foreground">Connection: {profile.name}</p>
        <p>Redis UI coming soon.</p>
      </div>
    )
  }

  return <div className="p-6">Unsupported database type.</div>
}
