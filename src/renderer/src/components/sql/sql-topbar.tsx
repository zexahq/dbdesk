import type { TableDataColumn, TableFilterCondition, TableSortRule } from '@common/types'
import { Button } from '@renderer/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@renderer/components/ui/toggle-group'
import { cn } from '@renderer/lib/utils'
import { useTabStore } from '@renderer/store/tab-store'
import { Layers, RefreshCcw, Table } from 'lucide-react'
import { useState } from 'react'
import { DeleteConfirmationDialog } from './dialogs/delete-confirmation-dialog'
import { TableColumnVisibilityDropdown } from './table-column-visibility-dropdown'
import { TableFilterPopover } from './table-filter-popover'
import { TableSortPopover } from './table-sort-popover'

interface SqlTopbarProps {
  tabId: string
  onRefresh: () => void
  isLoading: boolean
  columns?: TableDataColumn[]
  onDeleteRows: () => Promise<void> | void
  isDeletePending: boolean
}

export function SqlTopbar({
  tabId,
  onRefresh,
  isLoading,
  columns = [],
  onDeleteRows,
  isDeletePending
}: SqlTopbarProps) {
  const [open, setOpen] = useState(false)
  const tab = useTabStore((state) => state.tabs.find((t) => t.id === tabId))
  const updateTabState = useTabStore((state) => state.updateTabState)

  if (!tab) return null

  const selectedRowsCount = Object.keys(tab.rowSelection).length

  const handleDelete = async () => {
    try {
      await onDeleteRows()
    } finally {
      setOpen(false)
    }
  }

  const handleViewChange = (value: string) => {
    if (value === 'tables' || value === 'structure') {
      updateTabState(tabId, { view: value })
    }
  }

  const handleFiltersChange = (filters: TableFilterCondition[] | undefined) => {
    updateTabState(tabId, { filters, offset: 0 })
  }

  const handleSortRulesChange = (sortRules: TableSortRule[] | undefined) => {
    updateTabState(tabId, { sortRules, offset: 0 })
  }

  return (
    <div className="border-b">
      <div className="flex items-center justify-between gap-2 p-2">
        <div className="flex items-center gap-2">
          <ToggleGroup
            type="single"
            aria-label="Toggle view"
            value={tab.view}
            onValueChange={handleViewChange}
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
          {tab.view === 'tables' && (
            <TableFilterPopover
              columns={columns}
              activeFilters={tab.filters}
              onApply={handleFiltersChange}
            />
          )}
          {tab.view === 'tables' && (
            <TableSortPopover
              columns={columns}
              activeSorts={tab.sortRules}
              onApply={handleSortRulesChange}
            />
          )}
          <DeleteConfirmationDialog
            open={open}
            onOpenChange={setOpen}
            onDelete={handleDelete}
            selectedRowsCount={selectedRowsCount}
            isPending={isDeletePending}
          />
        </div>
        <div className="flex items-center gap-2 pt-1.5">
          {tab.view === 'tables' && (
            <TableColumnVisibilityDropdown tabId={tabId} columns={columns} />
          )}
          <Button variant="ghost" size="icon" className="cursor-pointer" onClick={onRefresh}>
            <RefreshCcw className={cn('size-4 cursor-pointer', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>
    </div>
  )
}
