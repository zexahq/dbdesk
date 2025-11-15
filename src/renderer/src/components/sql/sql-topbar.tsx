import { useState } from 'react'
import { cn } from '@renderer/lib/utils'
import { Button } from '@renderer/components/ui/button'
import { DeleteConfirmationDialog } from './dialogs/delete-confirmation-dialog'
import { ToggleGroup, ToggleGroupItem } from '@renderer/components/ui/toggle-group'
import { Layers, Table, RefreshCcw, PanelLeftClose, PanelLeftOpen, Unplug } from 'lucide-react'
import { useRouter } from '@tanstack/react-router'
import { useDisconnect } from '@renderer/api/queries/connections'
import { useSqlWorkspaceStore } from '@renderer/store/sql-workspace-store'
import { useDataTableStore } from '@renderer/store/data-table-store'

interface SqlTopbarProps {
  onRefresh: () => void
  isSidebarOpen: boolean
  isLoading: boolean
  view: 'tables' | 'structure'
  onSidebarOpenChange: (open: boolean) => void
  onViewChange: (view: 'tables' | 'structure') => void
  connectionId: string
}

export function SqlTopbar({
  view,
  onViewChange,
  isSidebarOpen,
  onSidebarOpenChange,
  onRefresh,
  isLoading,
  connectionId
}: SqlTopbarProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const { mutate: disconnect, isPending: isDisconnecting } = useDisconnect()
  const { reset } = useSqlWorkspaceStore()
  const selectedRowsCount = useDataTableStore((state) => Object.keys(state.rowSelection).length)

  const onDelete = () => {
    console.log('delete')
    setOpen(false)
  }

  const handleDisconnect = () => {
    disconnect(connectionId, {
      onSuccess: () => {
        reset()
        router.navigate({ to: '/' })
      }
    })
  }

  return (
    <div className="border-b">
      <div className="flex items-center justify-between gap-2 p-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="cursor-pointer"
            onClick={() => onSidebarOpenChange(!isSidebarOpen)}
          >
            {isSidebarOpen ? (
              <PanelLeftClose className="size-4" />
            ) : (
              <PanelLeftOpen className="size-4" />
            )}
            <span className="sr-only">Toggle sidebar</span>
          </Button>
          <ToggleGroup
            type="single"
            aria-label="Toggle view"
            defaultValue={view}
            onValueChange={onViewChange}
          >
            <ToggleGroupItem value="tables" aria-label="Toggle tables view">
              <Table className="size-4" />
              <span className="sr-only">Tables</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="structure" aria-label="Toggle structure view">
              <Layers className="size-4" />
              <span className="sr-only">Layers</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="flex items-center gap-2">
          <DeleteConfirmationDialog
            open={open}
            onOpenChange={setOpen}
            onDelete={onDelete}
            selectedRowsCount={selectedRowsCount}
          />
          <Button variant="ghost" size="icon" className="cursor-pointer" onClick={onRefresh}>
            <RefreshCcw className={cn('size-4 cursor-pointer', isLoading && 'animate-spin')} />
          </Button>
          <Button
            variant="destructive"
            size="icon"
            className="cursor-pointer"
            onClick={handleDisconnect}
            disabled={isDisconnecting}
          >
            <Unplug className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
