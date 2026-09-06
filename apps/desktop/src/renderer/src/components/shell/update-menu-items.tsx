import { ArrowDownToLine, CircleAlert, Loader2, RefreshCw } from 'lucide-react'
import { useUpdateState } from '@renderer/shared/hooks/use-update-state'
import { DropdownMenuItem, DropdownMenuSeparator } from '@renderer/components/ui/dropdown-menu'

export function UpdateMenuItems() {
  const updateState = useUpdateState()

  if (updateState.status === 'idle') return null

  if (updateState.status === 'available') {
    return (
      <>
        <DropdownMenuItem onClick={() => window.dbdesk.downloadUpdate()}>
          <ArrowDownToLine className="size-4" />
          <span className="flex-1">Update available</span>
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
          <Loader2 className="size-4 animate-spin" />
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
          <RefreshCw className="size-4" />
          <span className="flex-1">Restart to install</span>
          <span className="text-xs text-muted-foreground">v{updateState.version}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
      </>
    )
  }

  return (
    <>
      <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-destructive">
        <CircleAlert className="size-4 shrink-0" />
        <span className="text-xs truncate">{updateState.message}</span>
      </div>
      <DropdownMenuSeparator />
    </>
  )
}
