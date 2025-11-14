import type { TableDataColumn } from '@common/types'
import { ColumnDef } from '@tanstack/react-table'

const DEFAULT_COLUMN_WIDTH = 240
const DEFAULT_MIN_COLUMN_WIDTH = 120

export const getColumns = (columns: TableDataColumn[]): ColumnDef<Record<string, string>>[] => {
  return columns.map((column) => ({
    accessorKey: column.name,
    header: () => (
      <div className="flex flex-col px-2 py-1">
        <span className="font-medium text-accent-foreground">{column.name}</span>
        <span className="text-xs text-muted-foreground font-normal">{column.dataType}</span>
      </div>
    ),
    size: DEFAULT_COLUMN_WIDTH,
    minSize: DEFAULT_MIN_COLUMN_WIDTH
  }))
}
