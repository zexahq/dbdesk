import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Zap } from 'lucide-react'
import { useState } from 'react'

interface MySQLQuickConnectProps {
  onSuccess: (values: {
    name: string
    host: string
    port: number
    database: string
    user: string
    password: string
    ssl: boolean
  }) => void
}

export function MySQLQuickConnect({ onSuccess }: MySQLQuickConnectProps) {
  const [dsn, setDsn] = useState('')

  const handleQuickConnect = () => {
    const value = dsn.trim()
    if (!value) return

    try {
      const url = new URL(value)
      const rawProtocol = url.protocol.replace(':', '')

      if (rawProtocol !== 'mysql') {
        alert('Only mysql:// is supported for quick connect.')
        return
      }

      const defaultPort = 3306
      const database = url.pathname.replace('/', '')

      if (!database) {
        throw new Error('Missing database name')
      }

      const name = database

      // Parse SSL mode from query parameters
      const sslMode = url.searchParams.get('sslmode') || url.searchParams.get('ssl-mode')
      const sslEnabled =
        sslMode === 'require' ||
        sslMode === 'prefer' ||
        sslMode === 'verify-full' ||
        sslMode === 'verify-ca'

      onSuccess({
        name,
        host: url.hostname,
        port: Number(url.port || defaultPort),
        database,
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        ssl: sslEnabled
      })
      setDsn('')
    } catch {
      alert('Invalid DSN. Example:\\n- mysql://user:pass@host:3306/dbname')
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-4 sm:gap-3">
      <div className="flex-1">
        <label htmlFor="mysql-quick-connect" className="text-sm font-medium">
          Quick Connect (DSN)
        </label>
        <p className="text-xs text-muted-foreground">
          Paste a MySQL connection string to quickly fill the form below.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-1 sm:flex-row sm:items-center">
        <Input
          id="mysql-quick-connect"
          placeholder="mysql://user:pass@host:3306/dbname"
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
