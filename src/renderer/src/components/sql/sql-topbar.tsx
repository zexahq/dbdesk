import type { TableDataColumn, TableFilterCondition } from '@common/types'
import { useDisconnect } from '@renderer/api/queries/connections'
import { Button } from '@renderer/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@renderer/components/ui/toggle-group'
import { cn } from '@renderer/lib/utils'
import { useDataTableStore } from '@renderer/store/data-table-store'
import { useSqlWorkspaceStore } from '@renderer/store/sql-workspace-store'
import { useRouter } from '@tanstack/react-router'
import { Layers, PanelLeftClose, PanelLeftOpen, RefreshCcw, Table, Unplug } from 'lucide-react'
import { useState } from 'react'
import { DeleteConfirmationDialog } from './dialogs/delete-confirmation-dialog'
import { TableFilterPopover } from './table-filter-popover'

interface SqlTopbarProps {
  onRefresh: () => void
  isSidebarOpen: boolean
  isLoading: boolean
  view: 'tables' | 'structure'
  onSidebarOpenChange: (open: boolean) => void
  onViewChange: (view: 'tables' | 'structure') => void
  connectionId: string
  columns?: TableDataColumn[]
  filters?: TableFilterCondition[]
  onFiltersChange: (filters: TableFilterCondition[] | undefined) => void
}

export function SqlTopbar({
  view,
  onViewChange,
  isSidebarOpen,
  onSidebarOpenChange,
  onRefresh,
  isLoading,
  connectionId,
  columns = [],
  filters,
  onFiltersChange
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
          {view === 'tables' && (
            <TableFilterPopover
              columns={columns}
              activeFilters={filters}
              onApply={onFiltersChange}
            />
          )}
        </div>
        <div className="flex items-center gap-2 pt-1.5">
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
