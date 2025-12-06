import type { PostgreSQLSslMode } from '@common/types/sql'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Zap } from 'lucide-react'
import { useState } from 'react'

interface PostgresQuickConnectProps {
  onSuccess: (values: {
    name: string
    host: string
    port: number
    database: string
    user: string
    password: string
    sslMode: PostgreSQLSslMode
  }) => void
}

export function PostgresQuickConnect({ onSuccess }: PostgresQuickConnectProps) {
  const [dsn, setDsn] = useState('')

  const handleQuickConnect = () => {
    const value = dsn.trim()
    if (!value) return

    try {
      const url = new URL(value)
      const rawProtocol = url.protocol.replace(':', '')
      // Normalize adapter type for backend
      const isPostgres = rawProtocol === 'postgres' || rawProtocol === 'postgresql'

      if (!isPostgres) {
        alert('Only postgres:// and postgresql:// are supported for quick connect.')
        return
      }

      const defaultPort = 5432
      const database = url.pathname.replace('/', '')

      if (!database) {
        throw new Error('Missing database name')
      }

      const name = database

      // Parse SSL mode from query parameters
      const sslModeParam = url.searchParams.get('sslmode') || url.searchParams.get('ssl-mode')
      const validSslModes: PostgreSQLSslMode[] = ['disable', 'allow', 'prefer', 'require']
      const sslMode: PostgreSQLSslMode = validSslModes.includes(sslModeParam as PostgreSQLSslMode)
        ? (sslModeParam as PostgreSQLSslMode)
        : 'disable'

      onSuccess({
        name,
        host: url.hostname,
        port: Number(url.port || defaultPort),
        database,
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        sslMode
      })
      setDsn('')
    } catch {
      alert('Invalid DSN. Example:\n- postgresql://user:pass@host:5432/dbname')
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-4 sm:gap-3">
      <div className="flex-1">
        <label htmlFor="postgres-quick-connect" className="text-sm font-medium">
          Quick Connect (DSN)
        </label>
        <p className="text-xs text-muted-foreground">
          Paste a PostgreSQL connection string to quickly fill the form below.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-1 sm:flex-row sm:items-center">
        <Input
          id="postgres-quick-connect"
          placeholder="postgresql://user:pass@host:5432/dbname"
          value={dsn}
          onChange={(event) => setDsn(event.target.value)}
        />
        <Button variant="default" onClick={handleQuickConnect} className="sm:w-auto">
          <Zap className="size-4" />
          Connect
        </Button>
      </div>
    </div>
  )
}
