import { Layers, Table, RefreshCcw, PanelLeftClose, PanelLeftOpen, Trash } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@renderer/components/ui/toggle-group'
import { cn } from '@renderer/lib/utils'
import { useState } from 'react'
import { DeleteConfirmationDialog } from './dialogs/delete-confirmation-dialog'

interface SqlTopbarProps {
  onRefresh: () => void
  isSidebarOpen: boolean
  isLoading: boolean
  view: 'tables' | 'structure'
  onSidebarOpenChange: (open: boolean) => void
  onViewChange: (view: 'tables' | 'structure') => void
  selectedRowsCount: number
}

export function SqlTopbar({
  view,
  onViewChange,
  isSidebarOpen,
  onSidebarOpenChange,
  onRefresh,
  isLoading,
  selectedRowsCount
}: SqlTopbarProps) {
  const [open, setOpen] = useState(false)

  const onDelete = () => {
    console.log('delete')
    setOpen(false)
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
        </div>
      </div>
    </div>
  )
}
