import { useEffect, useState } from 'react'
import { ArrowDownToLine, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { useUpdateState } from '@renderer/shared/hooks/use-update-state'

export function UpdatesSection({ version }: { version: string }) {
  const updateState = useUpdateState()
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (updateState.status !== 'idle') setChecking(false)
  }, [updateState.status])

  const handleCheck = () => {
    setChecking(true)
    window.dbdesk.checkForUpdate()
    setTimeout(() => setChecking(false), 15000)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">DBDesk v{version || '…'}</p>
          <p className="text-xs text-muted-foreground mt-0.5" aria-live="polite">
            {updateState.status === 'idle' && 'You are up to date.'}
            {updateState.status === 'available' && `v${updateState.version} is available.`}
            {updateState.status === 'downloading' && `Downloading v… ${updateState.percent}%`}
            {updateState.status === 'downloaded' && `v${updateState.version} ready to install.`}
            {updateState.status === 'error' && updateState.message}
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

      <div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          disabled={checking}
          onClick={handleCheck}
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
    </div>
  )
}
