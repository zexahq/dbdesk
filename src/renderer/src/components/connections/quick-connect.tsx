import { useState } from 'react'
import type { ConnectionProfile } from '@common/types'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { useConnect, useCreateConnection } from '@renderer/api/queries/connections'

interface QuickConnectProps {
  onSuccess?: (profile: ConnectionProfile) => void
}

export function QuickConnect({ onSuccess }: QuickConnectProps) {
  const createMutation = useCreateConnection()
  const connectMutation = useConnect()
  const [dsn, setDsn] = useState('')

  const handleQuickConnect = async () => {
    const value = dsn.trim()
    if (!value) return

    try {
      const url = new URL(value)
      const rawProtocol = url.protocol.replace(':', '')
      // Normalize adapter type for backend, but keep a friendly display protocol for the name
      const isPostgres = rawProtocol === 'postgres' || rawProtocol === 'postgresql'
      const normalizedType = isPostgres ? 'postgres' : rawProtocol
      const displayProtocol = isPostgres ? 'postgresql' : rawProtocol

      if (normalizedType !== 'postgres' && normalizedType !== 'mysql') {
        alert(
          'Only postgres://, postgresql:// and mysql:// are supported for quick connect right now.'
        )
        return
      }

      const defaultPort = normalizedType === 'mysql' ? 3306 : 5432
      const database = url.pathname.replace('/', '')
      if (!database) {
        throw new Error('Missing database name')
      }
      const name = `${displayProtocol}://${url.hostname}:${url.port || String(defaultPort)}/${database}`

      const profile = await createMutation.mutateAsync({
        name,
        type: normalizedType as 'postgres' | 'mysql',
        options: {
          host: url.hostname,
          port: Number(url.port || defaultPort),
          database,
          user: decodeURIComponent(url.username),
          password: decodeURIComponent(url.password),
          ssl: false
        }
      })

      await connectMutation.mutateAsync(profile.id)
      setDsn('')
      onSuccess?.(profile)
    } catch {
      alert(
        'Invalid DSN. Examples:\n- postgresql://user:pass@host:5432/dbname\n- mysql://user:pass@host:3306/dbname'
      )
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-4 sm:gap-3">
      <div className="flex-1">
        <label htmlFor="quick-connect" className="text-sm font-medium">
          Quick Connect (DSN)
        </label>
        <p className="text-xs text-muted-foreground">
          Paste a connection string to create and connect in one step.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-1 sm:flex-row sm:items-center">
        <Input
          id="quick-connect"
          placeholder="postgresql://user:pass@host:5432/dbname"
          value={dsn}
          onChange={(event) => setDsn(event.target.value)}
        />
        <Button variant="secondary" onClick={handleQuickConnect} className="sm:w-auto">
          Connect
        </Button>
      </div>
    </div>
  )
}
