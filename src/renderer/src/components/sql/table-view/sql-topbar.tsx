import type { TableDataColumn, TableFilterCondition, TableSortRule } from '@common/types'
import { Button } from '@renderer/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@renderer/components/ui/toggle-group'
import { cn } from '@renderer/lib/utils'
import { TableTab, useTabStore } from '@renderer/store/tab-store'
import { Layers, RefreshCcw, Table } from 'lucide-react'
import { useState } from 'react'
import { DeleteConfirmationDialog } from '../dialogs/delete-confirmation-dialog'
import { TableFilterPopover } from './table-filter-popover'
import { TableSortPopover } from './table-sort-popover'

interface SqlTopbarProps {
  activeTab: TableTab
  onRefresh: () => void
  isLoading: boolean
  columns?: TableDataColumn[]
  onDelete: () => Promise<void> | void
  isDeletePending: boolean
  rowSelectionCount: number
}

export function SqlTopbar({
  activeTab,
  onRefresh,
  isLoading,
  columns = [],
  onDelete,
  isDeletePending,
  rowSelectionCount
}: SqlTopbarProps) {
  const [open, setOpen] = useState(false)

  const updateTableTab = useTabStore((state) => state.updateTableTab)

  const handleDelete = async () => {
    try {
      await onDelete()
    } finally {
      setOpen(false)
    }
  }

  const handleViewChange = (value: string) => {
    if (value === 'tables' || value === 'structure') {
      updateTableTab(activeTab.id, { view: value })
    }
  }

  const handleFiltersChange = (filters: TableFilterCondition[] | undefined) => {
    updateTableTab(activeTab.id, { filters, offset: 0 })
  }

  const handleSortRulesChange = (sortRules: TableSortRule[] | undefined) => {
    updateTableTab(activeTab.id, { sortRules, offset: 0 })
  }

  return (
    <div className="border-b">
      <div className="flex items-center justify-between gap-2 p-2">
        <div className="flex items-center gap-2">
          <ToggleGroup
            type="single"
            aria-label="Toggle view"
            value={activeTab.view}
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
          {activeTab.view === 'tables' && (
            <TableFilterPopover
              columns={columns}
              activeFilters={activeTab.filters}
              onApply={handleFiltersChange}
            />
          )}
          {activeTab.view === 'tables' && (
            <TableSortPopover
              columns={columns}
              activeSorts={activeTab.sortRules}
              onApply={handleSortRulesChange}
            />
          )}
          <DeleteConfirmationDialog
            open={open}
            onOpenChange={setOpen}
            onDelete={handleDelete}
            selectedRowsCount={rowSelectionCount}
            isPending={isDeletePending}
          />
        </div>
        <div className="flex items-center gap-2 pt-1.5">
          {/* TODO: Re-enable column visibility feature */}
          {/* {activeTab.view === 'tables' && (
           <TableColumnVisibilityDropdown
             columns={columns}
           />
          )} */}
          <Button variant="ghost" size="icon" className="cursor-pointer" onClick={onRefresh}>
            <RefreshCcw className={cn('size-4 cursor-pointer', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>
    </div>
  )
}
