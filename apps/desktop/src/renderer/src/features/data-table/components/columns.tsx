import type {
  ConstraintInfo,
  QueryResultRow,
  TableDataColumn,
  TableSortRule
} from '@dbdesk/shared/types'
import { Checkbox } from '@renderer/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import {
  formatCellValue,
  getCellVariant,
  getSelectionColumnId
} from '@renderer/features/data-table/lib/data-table'
import {
  getForeignKeyNavigation,
  isForeignKeyActivationKey,
  type ForeignKeyNavigation
} from '@renderer/features/data-table/lib/foreign-key-navigation'
import { cn } from '@renderer/shared/lib/utils'
import { ColumnDef } from '@tanstack/react-table'
import { ChevronDown, ChevronUp, ExternalLink, Key, Link } from 'lucide-react'

const DEFAULT_COLUMN_WIDTH = 240
const DEFAULT_MIN_COLUMN_WIDTH = 120

type GetColumnsOptions = {
  constraints?: ConstraintInfo[]
  onForeignKeyOpen?: (navigation: ForeignKeyNavigation) => void
  onSortChange?: (sortRules: TableSortRule[] | undefined) => void
}

type DataTableMeta = {
  sortRules?: TableSortRule[]
  onCellFocus?: (rowIndex: number, columnId: string) => void
}

type ForeignKeyLinkProps = {
  label: string
  value: string
  onFocus: () => void
  onOpen: () => void
}

function ForeignKeyLink({ label, value, onFocus, onOpen }: ForeignKeyLinkProps) {
  return (
    <div className="flex min-w-0 items-center gap-1">
      <span className="min-w-0 flex-1 truncate">{value}</span>
      <button
        type="button"
        data-foreign-key-navigation
        className="shrink-0 rounded-sm p-0.5 text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={label}
        onFocus={onFocus}
        onClick={(event) => {
          event.stopPropagation()
          onOpen()
        }}
        onDoubleClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (isForeignKeyActivationKey(event.key)) event.stopPropagation()
        }}
      >
        <ExternalLink className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  )
}

export const getColumns = (
  columns: TableDataColumn[],
  { constraints, onForeignKeyOpen, onSortChange }: GetColumnsOptions = {}
): ColumnDef<QueryResultRow>[] => {
  return [
    {
      id: getSelectionColumnId(columns.map((column) => column.name)),
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
      enableResizing: false,
      meta: { isSelectionColumn: true }
    },
    ...columns.map((column) => ({
      id: column.name,
      accessorKey: column.name,
      header: ({ table }) => {
        const meta = table.options.meta as DataTableMeta | undefined

        const sortRules = meta?.sortRules
        const currentRule = sortRules?.find((rule) => rule.column === column.name)
        const direction = currentRule?.direction

        const handleSortClick = (event: React.MouseEvent<HTMLButtonElement>) => {
          event.stopPropagation()
          if (!onSortChange) return

          let nextSortRules: TableSortRule[] | undefined

          // Cycle through: no sort (null) → ASC → DESC → no sort (null)
          if (!direction) {
            // Set to ascending
            nextSortRules = [{ column: column.name, direction: 'ASC' }]
          } else if (direction === 'ASC') {
            // Set to descending
            nextSortRules = [{ column: column.name, direction: 'DESC' }]
          } else {
            // direction === 'DESC', clear sort for this column
            const remainingRules = (sortRules ?? []).filter((rule) => rule.column !== column.name)
            nextSortRules = remainingRules.length > 0 ? remainingRules : undefined
          }

          onSortChange(nextSortRules)
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
            {onSortChange ? (
              <button
                type="button"
                onClick={handleSortClick}
                className={cn(
                  'inline-flex items-center justify-center rounded-sm p-0.5 cursor-pointer',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  direction
                    ? 'text-foreground font-bold'
                    : 'text-muted-foreground/40 hover:text-foreground/60'
                )}
                aria-label={
                  direction === 'ASC'
                    ? `Sort by ${column.name} ascending`
                    : direction === 'DESC'
                      ? `Sort by ${column.name} descending`
                      : `Sort by ${column.name}`
                }
              >
                {direction === 'DESC' ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronUp className="size-4" />
                )}
              </button>
            ) : null}
          </div>
        )
      },
      cell: ({ getValue, row, table }) => {
        const value = getValue()
        const formattedValue = formatCellValue(value, column.dataType)
        const isNull = value === null
        const navigation = getForeignKeyNavigation(column, constraints, value)
        const meta = table.options.meta as DataTableMeta | undefined

        if (navigation && onForeignKeyOpen) {
          return (
            <ForeignKeyLink
              label={`Preview ${navigation.referencedSchema}.${navigation.referencedTable} where ${navigation.referencedColumn} equals ${formattedValue}`}
              value={formattedValue}
              onFocus={() => meta?.onCellFocus?.(row.index, column.name)}
              onOpen={() => onForeignKeyOpen(navigation)}
            />
          )
        }

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
