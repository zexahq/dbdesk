import { useEffect, useState } from 'react'
import { ArrowDownToLine, RefreshCw, X } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'

type UpdateState =
  | { status: 'idle' }
  | { status: 'available'; version: string; releaseNotes?: string }
  | { status: 'downloading'; percent: number }
  | { status: 'downloaded'; version: string }
  | { status: 'error'; message: string }

/**
 * Non-intrusive banner that shows when a new version is available.
 * Renders at the bottom of the sidebar or wherever it's placed.
 */
export function UpdateNotification() {
  const [state, setState] = useState<UpdateState>({ status: 'idle' })
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const cleanups = [
      window.dbdesk.onUpdateAvailable((data) => {
        setState({ status: 'available', version: data.version, releaseNotes: data.releaseNotes })
        setDismissed(false)
      }),
      window.dbdesk.onUpdateDownloaded((data) => {
        setState({ status: 'downloaded', version: data.version })
      }),
      window.dbdesk.onUpdateProgress((data) => {
        setState({ status: 'downloading', percent: data.percent })
      }),
      window.dbdesk.onUpdateError((data) => {
        setState({ status: 'error', message: data.message })
      }),
    ]

    return () => cleanups.forEach((fn) => fn())
  }, [])

  if (state.status === 'idle' || dismissed) return null

  return (
    <div className="mx-2 mb-2 rounded-md border bg-card p-3 text-sm shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {state.status === 'available' && (
            <>
              <p className="font-medium">Update available</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Version {state.version} is ready to download.
              </p>
              <Button
                size="sm"
                variant="default"
                className="mt-2 h-7 text-xs"
                onClick={() => window.dbdesk.downloadUpdate()}
              >
                <ArrowDownToLine className="size-3" />
                Download
              </Button>
            </>
          )}

          {state.status === 'downloading' && (
            <>
              <p className="font-medium">Downloading update...</p>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${state.percent}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{state.percent}%</p>
            </>
          )}

          {state.status === 'downloaded' && (
            <>
              <p className="font-medium">Ready to install</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Version {state.version} will install on restart.
              </p>
              <Button
                size="sm"
                variant="default"
                className="mt-2 h-7 text-xs"
                onClick={() => window.dbdesk.installUpdate()}
              >
                <RefreshCw className="size-3" />
                Restart now
              </Button>
            </>
          )}

          {state.status === 'error' && (
            <>
              <p className="font-medium text-destructive">Update failed</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{state.message}</p>
            </>
          )}
        </div>

        <button
          type='button'
          title='close'
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground shrink-0 p-0.5 cursor-pointer"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  )
}
