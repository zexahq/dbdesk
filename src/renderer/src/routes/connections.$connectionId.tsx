import { createFileRoute } from '@tanstack/react-router'
import { useConnection } from '../api/queries/connections'
import { SqlWorkspace } from '../components/sql'

export const Route = createFileRoute('/connections/$connectionId')({
  component: ConnectionPage
})

function ConnectionPage() {
  const { connectionId } = Route.useParams()
  const { data: profile, isLoading } = useConnection(connectionId)

  if (isLoading) {
    return <div className="p-6">Loading connection…</div>
  }

  if (!profile) {
    return <div className="p-6">Connection not found.</div>
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

  return <div className="p-6">{`Unsupported database type : ${profile.type}`}</div>
}
