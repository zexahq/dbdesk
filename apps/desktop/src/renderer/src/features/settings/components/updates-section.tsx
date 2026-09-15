import { ArrowDownToLine, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { useUpdateState } from '@renderer/shared/hooks/use-update-state'

export function UpdatesSection({ version }: { version: string }) {
  const updateState = useUpdateState()
  const checking = updateState.status === 'checking'

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border p-4 flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium">DBDesk v{version || '…'}</p>
          <p className="text-xs text-muted-foreground mt-0.5" aria-live="polite">
            {updateState.status === 'idle' && 'Updates are checked automatically.'}
            {updateState.status === 'manual' && updateState.message}
            {updateState.status === 'checking' && 'Checking for updates…'}
            {updateState.status === 'up-to-date' && 'You are up to date.'}
            {updateState.status === 'available' && `v${updateState.version} is available.`}
            {updateState.status === 'downloading' &&
              `Downloading v${updateState.version}… ${updateState.percent}%`}
            {updateState.status === 'downloaded' && `v${updateState.version} ready to install.`}
            {updateState.status === 'error' && `Update failed: ${updateState.message}. Try again.`}
          </p>
        </div>
        {updateState.status === 'available' && (
          <Button size="sm" className="h-7 text-xs" onClick={() => window.dbdesk.downloadUpdate()}>
            <ArrowDownToLine aria-hidden="true" className="size-3.5" />
            Download
          </Button>
        )}
        {updateState.status === 'downloading' && (
          <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
        )}
        {updateState.status === 'downloaded' && (
          <Button size="sm" className="h-7 text-xs" onClick={() => window.dbdesk.installUpdate()}>
            <RefreshCw aria-hidden="true" className="size-3.5" />
            Restart to Install
          </Button>
        )}
      </div>

      {updateState.status !== 'manual' && (
        <div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            disabled={checking}
            onClick={() => window.dbdesk.checkForUpdate()}
          >
            {checking && (
              <Loader2
                aria-hidden="true"
                className="size-3.5 animate-spin motion-reduce:animate-none"
              />
            )}
            Check for Updates
          </Button>
        </div>
      )}
    </div>
  )
}
