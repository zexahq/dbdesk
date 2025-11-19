import type { QueryResultRow, TableDataColumn } from '@common/types'
import { Checkbox } from '@renderer/components/ui/checkbox'
import { formatCellValue, getCellVariant } from '@renderer/lib/data-table'
import { cn } from '@renderer/lib/utils'
import { ColumnDef } from '@tanstack/react-table'
import { Key } from 'lucide-react'

const DEFAULT_COLUMN_WIDTH = 240
const DEFAULT_MIN_COLUMN_WIDTH = 120

export const getColumns = (columns: TableDataColumn[]): ColumnDef<QueryResultRow>[] => {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className={cn(
            'border-foreground/20 bg-background/80',
            'data-[state=checked]:bg-primary data-[state=checked]:border-primary',
            'data-[state=checked]:text-primary-foreground',
            'hover:border-foreground/40 hover:bg-background',
            'dark:border-foreground/30 dark:bg-background/60',
            'dark:data-[state=checked]:bg-primary dark:data-[state=checked]:border-primary',
            'dark:hover:border-foreground/50 dark:hover:bg-background/80'
          )}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className={cn(
            'border-foreground/20 bg-background/80',
            'data-[state=checked]:bg-primary data-[state=checked]:border-primary',
            'data-[state=checked]:text-primary-foreground',
            'hover:border-foreground/40 hover:bg-background',
            'dark:border-foreground/30 dark:bg-background/60',
            'dark:data-[state=checked]:bg-primary dark:data-[state=checked]:border-primary',
            'dark:hover:border-foreground/50 dark:hover:bg-background/80'
          )}
        />
      ),
      size: 32,
      enableSorting: false,
      enableHiding: false,
      enableResizing: false
    },
    ...columns.map((column) => ({
      accessorKey: column.name,
      header: () => (
        <div className="flex flex-col px-2 py-1">
          <span className="font-medium text-accent-foreground flex items-center gap-1">
            {column.name}
            {column.isPrimaryKey ? (
              <Key className="size-3 text-muted-foreground" aria-label="Primary key" />
            ) : null}
          </span>
          <span className="text-xs text-muted-foreground font-normal">{column.dataType}</span>
        </div>
      ),
      cell: ({ getValue }) => {
        const value = getValue()
        const formattedValue = formatCellValue(value, column.dataType)
        const isNull = value === null
        return (
          <span className={cn('truncate', isNull && 'text-muted-foreground')}>
            {formattedValue}
          </span>
        )
      },
      meta: {
        dataType: column.dataType,
        name: column.name,
        variant: getCellVariant(column.dataType),
        isPrimaryKey: column.isPrimaryKey ?? false
      },
      size: DEFAULT_COLUMN_WIDTH,
      minSize: DEFAULT_MIN_COLUMN_WIDTH
    }))
  ]
}
