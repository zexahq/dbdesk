import type { SQLConnectionProfile } from '@common/types'
import { useDisconnect } from '@renderer/api/queries/connections'
import { Button } from '@renderer/components/ui/button'
import { useRouter } from '@tanstack/react-router'
import { PanelLeftClose, PanelLeftOpen, Unplug } from 'lucide-react'

interface QueryTopbarProps {
  profile: SQLConnectionProfile
  isSidebarOpen: boolean
  onSidebarOpenChange: (open: boolean) => void
}

export function QueryTopbar({ profile, isSidebarOpen, onSidebarOpenChange }: QueryTopbarProps) {
  const router = useRouter()
  const { mutate: disconnect, isPending: isDisconnecting } = useDisconnect()

  const handleDisconnect = () => {
    disconnect(profile.id, {
      onSuccess: () => {
        router.navigate({ to: '/' })
      }
    })
  }

  return (
    <div className="border-b h-10 bg-muted/20 flex items-center">
      {/* Sidebar toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="h-full w-10 rounded-none border-r border-border/50 shrink-0"
        onClick={() => onSidebarOpenChange(!isSidebarOpen)}
      >
        {isSidebarOpen ? (
          <PanelLeftClose className="size-4" />
        ) : (
          <PanelLeftOpen className="size-4" />
        )}
        <span className="sr-only">Toggle sidebar</span>
      </Button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Disconnect button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-full w-10 cursor-pointer rounded-none border-l border-border/50 shrink-0 hover:bg-destructive/10 hover:text-destructive"
        onClick={handleDisconnect}
        disabled={isDisconnecting}
      >
        <Unplug className="size-4" />
        <span className="sr-only">Disconnect</span>
      </Button>
    </div>
  )
}
