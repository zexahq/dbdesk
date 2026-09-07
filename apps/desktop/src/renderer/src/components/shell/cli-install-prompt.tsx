import { useEffect, useState } from 'react'
import { Terminal, X } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'

type Status = 'loading' | 'prompt' | 'installing' | 'done' | 'error' | 'hidden'

/**
 * Fixed-position toast at bottom-right prompting the user to install
 * the `dbdesk` CLI command. Shown once — tracked via IPC/app_meta.
 */
export function CliInstallPrompt() {
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    window.dbdesk.getCliStatus().then(({ installed, promptDismissed }) => {
      if (installed || promptDismissed) {
        setStatus('hidden')
      } else {
        setStatus('prompt')
      }
    }).catch(() => setStatus('hidden'))
  }, [])

  async function handleInstall() {
    setStatus('installing')
    const result = await window.dbdesk.installCli()
    if (result.ok) {
      setStatus('done')
    } else {
      setError(result.error ?? 'Unknown error')
      setStatus('error')
    }
  }

  function handleDismiss() {
    window.dbdesk.dismissCliPrompt()
    setStatus('hidden')
  }

  if (status === 'loading' || status === 'hidden') return null

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border bg-card p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <Terminal className="size-5 text-primary shrink-0 mt-0.5" />

        <div className="flex-1 min-w-0">
          {status === 'prompt' && (
            <>
              <p className="text-sm font-medium">
                Install <code className="text-xs bg-muted px-1 rounded">dbdesk</code> CLI
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Enables AI agents (Claude Code, OpenCode, Cursor) to explore your
                databases, run queries, and create dashboards from the terminal.
              </p>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="default"
                  className="h-7 text-xs"
                  onClick={handleInstall}
                >
                  Install
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={handleDismiss}
                >
                  Not now
                </Button>
              </div>
            </>
          )}

          {status === 'installing' && (
            <p className="text-sm text-muted-foreground">Installing...</p>
          )}

          {status === 'done' && (
            <>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                CLI installed
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Try: <code className="text-xs bg-muted px-1 rounded">dbdesk connection list</code>
              </p>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs mt-2"
                onClick={handleDismiss}
              >
                Got it
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <p className="text-sm font-medium text-destructive">Install failed</p>
              <p className="text-xs text-muted-foreground mt-1 truncate">{error}</p>
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={handleInstall}
                >
                  Retry
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={handleDismiss}
                >
                  Dismiss
                </Button>
              </div>
            </>
          )}
        </div>

        {status !== 'installing' && (
          <button
            type="button"
            title="Dismiss"
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground shrink-0 p-0.5 cursor-pointer"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
