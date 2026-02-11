import { createFileRoute } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import type { DashboardConfig } from '@common/types'
import { useConnection } from '../api/queries/connections'
import { SqlWorkspace } from '../components/sql'
import { DashboardCanvas } from '../components/dashboard'
import { useDashboardStore } from '../store/dashboard-store'

export const Route = createFileRoute('/connections/$connectionId')({
  component: ConnectionPage
})

function ConnectionPage() {
  const { connectionId } = Route.useParams()
  const queryClient = useQueryClient()
  const { data: profile, isLoading } = useConnection(connectionId)
  const currentDashboard = useDashboardStore((s) => s.currentDashboard)
  const setCurrentDashboard = useDashboardStore((s) => s.setCurrentDashboard)
  const persistDashboard = useDashboardStore((s) => s.persistDashboard)
  const saveDashboard = useDashboardStore((s) => s.saveDashboard)

  const handleSaveDashboard = async (config: DashboardConfig) => {
    const saved = await saveDashboard(config)
    setCurrentDashboard(saved)
    // Invalidate dashboards query to sync the list
    await queryClient.invalidateQueries({ queryKey: ['dashboards', connectionId] })
  }

  const handleCloseDashboard = async () => {
    if (currentDashboard) {
      try {
        // Persist dashboard to YAML file before closing
        await persistDashboard(currentDashboard.dashboardId)
        console.log('Dashboard persisted successfully:', currentDashboard.dashboardId)
      } catch (error) {
        console.error('Failed to persist dashboard on close:', error)
      }
    }
    setCurrentDashboard(null)
  }

  if (isLoading) {
    return <div className="p-6">Loading connection…</div>
  }

  if (!profile) {
    return <div className="p-6">Connection not found.</div>
  }

  // If a dashboard is selected, show the dashboard canvas
  if (currentDashboard) {
    return (
      <DashboardCanvas
        dashboard={currentDashboard}
        connectionId={connectionId}
        onSave={handleSaveDashboard}
        onClose={handleCloseDashboard}
      />
    )
  }

  // SQL databases: 'postgres' | 'mysql'
  const isSql = profile.type === 'postgres' || profile.type === 'mysql'

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
