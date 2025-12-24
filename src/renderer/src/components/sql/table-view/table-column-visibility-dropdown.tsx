import type { TableDataColumn } from '@common/types'
import { Button } from '@renderer/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import { Input } from '@renderer/components/ui/input'
import { cn } from '@renderer/lib/utils'
import { TableTab, useTabStore } from '@renderer/store/tab-store'
import { AlertCircle, Search, SlidersHorizontal, X } from 'lucide-react'
import { useMemo, useState } from 'react'

interface TableColumnVisibilityDropdownProps {
  activeTab: TableTab
  columns?: TableDataColumn[]
}

export function TableColumnVisibilityDropdown({
  activeTab,
  columns = []
}: TableColumnVisibilityDropdownProps) {
  const updateTableTab = useTabStore((state) => state.updateTableTab)
  const [searchQuery, setSearchQuery] = useState('')

  const columnVisibility = activeTab.columnVisibility

  const setColumnVisibility = (
    visibility:
      | typeof columnVisibility
      | ((prev: typeof columnVisibility) => typeof columnVisibility)
  ) => {
    updateTableTab(activeTab.id, {
      columnVisibility: typeof visibility === 'function' ? visibility(columnVisibility) : visibility
    })
  }

  // Filter columns based on search query
  const filteredColumns = useMemo(() => {
    if (!searchQuery) return columns
    const query = searchQuery.toLowerCase()
    return columns.filter((col) => col.name.toLowerCase().includes(query))
  }, [columns, searchQuery])

  // Get visible columns count
  const visibleColumnsCount = useMemo(() => {
    return columns.filter((col) => {
      const isHidden = columnVisibility[col.name] === false
      return !isHidden
    }).length
  }, [columns, columnVisibility])

  const allVisible = visibleColumnsCount === columns.length
  const someVisible = visibleColumnsCount > 0 && visibleColumnsCount < columns.length
  const allDeselected = visibleColumnsCount === 0

  const handleToggleColumn = (columnName: string, checked: boolean) => {
    setColumnVisibility((prev) => {
      const newState = { ...prev }
      if (checked) {
        // Column should be visible - remove from state (undefined = visible in TanStack Table)
        delete newState[columnName]
      } else {
        // Column should be hidden - set to false
        newState[columnName] = false
      }
      return newState
    })
  }

  const handleDeselectAll = () => {
    const newVisibility: Record<string, boolean> = {}
    columns.forEach((col) => {
      newVisibility[col.name] = false
    })
    setColumnVisibility(newVisibility)
  }

  const handleSelectAll = () => {
    // Remove all columns from visibility state (undefined = visible in TanStack Table)
    setColumnVisibility({})
  }

  if (columns.length === 0) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="relative inline-block">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-8 gap-2 cursor-pointer',
              (someVisible || !allVisible) && 'bg-accent text-accent-foreground '
            )}
          >
            <SlidersHorizontal className="size-4" />
            <span>Columns</span>
          </Button>
          {allDeselected && (
            <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white">
              <AlertCircle className="size-4 text-black" />
            </div>
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="text-sm font-medium">Toggle columns</DropdownMenuLabel>
          {allDeselected ? (
            <button
              onClick={handleSelectAll}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Select all
            </button>
          ) : (
            <button
              onClick={handleDeselectAll}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Deselect all
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              className="h-8 pl-8 pr-8"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-[300px] overflow-y-auto py-2">
          {filteredColumns.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">No columns found</div>
          ) : (
            filteredColumns.map((column) => {
              const isVisible = columnVisibility[column.name] !== false
              return (
                <DropdownMenuCheckboxItem
                  key={column.name}
                  checked={isVisible}
                  onCheckedChange={(checked) => handleToggleColumn(column.name, checked)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {column.name}
                </DropdownMenuCheckboxItem>
              )
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
