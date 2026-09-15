import { ArrowDownToLine, CircleAlert, Loader2, RefreshCw } from 'lucide-react'
import { useUpdateState } from '@renderer/shared/hooks/use-update-state'
import { DropdownMenuItem, DropdownMenuSeparator } from '@renderer/components/ui/dropdown-menu'

export function UpdateMenuItems() {
  const updateState = useUpdateState()

  if (
    updateState.status === 'idle' ||
    updateState.status === 'checking' ||
    updateState.status === 'up-to-date'
  ) {
    return null
  }

  if (updateState.status === 'available') {
    return (
      <>
        <DropdownMenuItem onClick={() => window.dbdesk.downloadUpdate()}>
          <ArrowDownToLine aria-hidden="true" className="size-4" />
          <span className="flex-1">Update Available</span>
          <span className="text-xs text-muted-foreground">v{updateState.version}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
      </>
    )
  }

  if (updateState.status === 'downloading') {
    return (
      <>
        <div className="flex items-center gap-2 px-2 py-1.5 text-sm">
          <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
          <span className="flex-1">Downloading…</span>
          <span className="text-xs tabular-nums text-muted-foreground">{updateState.percent}%</span>
        </div>
        <DropdownMenuSeparator />
      </>
    )
  }

  if (updateState.status === 'downloaded') {
    return (
      <>
        <DropdownMenuItem onClick={() => window.dbdesk.installUpdate()}>
          <RefreshCw aria-hidden="true" className="size-4" />
          <span className="flex-1">Restart to Install</span>
          <span className="text-xs text-muted-foreground">v{updateState.version}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
      </>
    )
  }

  return (
    <>
      <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-destructive">
        <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-xs">{updateState.message}</span>
      </div>
      <DropdownMenuSeparator />
    </>
  )
}
