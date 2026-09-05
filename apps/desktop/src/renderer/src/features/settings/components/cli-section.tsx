import { useEffect, useState } from 'react'
import { Check, Copy, Loader2, TerminalSquare } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'

type CliState = { installed: boolean; path: string }

export function CliSection() {
  const [status, setStatus] = useState<CliState | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const refresh = async () => {
    try {
      const s = await window.dbdesk.getCliStatus()
      setStatus({ installed: s.installed, path: s.path })
    } catch {
      setStatus(null)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const handleInstall = async () => {
    setBusy(true)
    setError('')
    try {
      const result = await window.dbdesk.installCli()
      if (!result.ok) {
        setError(result.error ?? 'Install failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Install failed')
    } finally {
      setBusy(false)
      refresh()
    }
  }

  const handleUninstall = async () => {
    setBusy(true)
    setError('')
    try {
      const result = await window.dbdesk.uninstallCli()
      if (!result.ok) {
        setError(result.error ?? 'Uninstall failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Uninstall failed')
    } finally {
      setBusy(false)
      refresh()
    }
  }

  const handleCopyPath = async () => {
    if (!status) return
    try {
      await navigator.clipboard.writeText(status.path)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <p className="text-sm break-words text-muted-foreground">
        The <code className="text-xs bg-muted px-1 rounded">dbdesk</code> command lets you and your
        AI agents explore databases, run queries, and build dashboards from the terminal.
      </p>

      <div className="rounded-lg border p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <TerminalSquare className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">Status</span>
          <span
            className={
              status == null
                ? 'text-xs text-muted-foreground'
                : status.installed
                  ? 'text-xs text-green-600 dark:text-green-400'
                  : 'text-xs text-muted-foreground'
            }
          >
            {status == null ? 'Checking…' : status.installed ? '● Installed' : '○ Not installed'}
          </span>
        </div>

        {status && (
          <div className="flex min-w-0 items-center gap-2">
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded truncate flex-1 min-w-0">
              {status.path}
            </code>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleCopyPath}>
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </Button>
          </div>
        )}

        {error && <p className="text-xs break-all text-destructive">{error}</p>}

        <div className="flex gap-2">
          {status?.installed ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={busy}
              onClick={handleUninstall}
            >
              {busy && <Loader2 className="size-3.5 animate-spin" />}
              Uninstall
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={busy || status == null}
              onClick={handleInstall}
            >
              {busy && <Loader2 className="size-3.5 animate-spin" />}
              Install
            </Button>
          )}
        </div>
      </div>

      <p className="text-xs break-words text-muted-foreground">
        Verify in a terminal with{' '}
        <code className="text-xs bg-muted px-1 rounded">dbdesk connection list</code>. Run{' '}
        <code className="text-xs bg-muted px-1 rounded">dbdesk skill install</code> to teach your AI
        agents to use it.
      </p>
    </div>
  )
}
