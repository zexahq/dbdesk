import type { QueryResultRow, TableDataColumn, TableSortRule } from '@common/types'
import { Checkbox } from '@renderer/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { formatCellValue, getCellVariant } from '@renderer/lib/data-table'
import { cn } from '@renderer/lib/utils'
import { ColumnDef } from '@tanstack/react-table'
import { ChevronDown, ChevronUp, Key, Link } from 'lucide-react'

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
      id: column.name,
      accessorKey: column.name,
      header: ({ table }) => {
        const meta = table.options.meta as
          | {
              sortRules?: TableSortRule[]
              toggleColumnSort?: (columnName: string) => void
              setColumnSortDirection?: (columnName: string, direction: 'ASC' | 'DESC') => void
            }
          | undefined

        const sortRules = meta?.sortRules
        const currentRule = sortRules?.find((rule) => rule.column === column.name)
        const direction = currentRule?.direction

        const handleSortAscending = (event: React.MouseEvent<HTMLButtonElement>) => {
          event.stopPropagation()
          meta?.setColumnSortDirection?.(column.name, 'ASC')
        }

        const handleSortDescending = (event: React.MouseEvent<HTMLButtonElement>) => {
          event.stopPropagation()
          meta?.setColumnSortDirection?.(column.name, 'DESC')
        }

        return (
          <div className="flex items-center justify-between px-2 py-1">
            <div className="flex gap-2">
              <div className="flex flex-col items-start justify-start gap-1 translate-y-1">
                {column.isPrimaryKey ? (
                  <Key className="size-3 text-yellow-400 rotate-45" aria-label="Primary key" />
                ) : null}
                {column.foreignKey ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        className="size-3 text-green-400 cursor-help"
                        aria-label="Foreign key"
                      />
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <div className="flex flex-col gap-1 text-sm">
                        <div className="font-semibold">Foreign key relation:</div>
                        <div>
                          {column.name} → {column.foreignKey.referencedSchema}.
                          {column.foreignKey.referencedTable}.{column.foreignKey.referencedColumn}
                        </div>
                        <div>On update: {column.foreignKey.onUpdate}</div>
                        <div>On delete: {column.foreignKey.onDelete}</div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ) : null}
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-accent-foreground">{column.name}</span>
                <span className="text-xs text-muted-foreground font-normal">{column.dataType}</span>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center gap-0.5">
              <button
                type="button"
                onClick={handleSortAscending}
                className={cn(
                  'inline-flex items-center justify-center rounded-sm p-0.5 cursor-pointer',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  direction === 'ASC' ? 'text-foreground font-bold' : 'text-muted-foreground/40 hover:text-foreground/60'
                )}
                aria-label={`Sort by ${column.name} ascending`}
              >
                <ChevronUp className="size-4" />
              </button>
              <button
                type="button"
                onClick={handleSortDescending}
                className={cn(
                  'inline-flex items-center justify-center rounded-sm p-0.5 cursor-pointer',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  direction === 'DESC' ? 'text-foreground font-bold' : 'text-muted-foreground/40 hover:text-foreground/60'
                )}
                aria-label={`Sort by ${column.name} descending`}
              >
                <ChevronDown className="size-4" />
              </button>
            </div>
          </div>
        )
      },
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
        variant: getCellVariant(column.dataType, column.enumValues),
        isPrimaryKey: column.isPrimaryKey ?? false,
        enumValues: column.enumValues,
        foreignKey: column.foreignKey
      },
      size: DEFAULT_COLUMN_WIDTH,
      minSize: DEFAULT_MIN_COLUMN_WIDTH
    }))
  ]
}
