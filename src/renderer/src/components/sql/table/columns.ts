import { ColumnDef } from '@tanstack/react-table'

const DEFAULT_COLUMN_WIDTH = 240
const DEFAULT_MIN_COLUMN_WIDTH = 120

export const getColumns = (columns: string[]): ColumnDef<Record<string, string>>[] => {
  return columns.map((column) => ({
    accessorKey: column,
    header: column,
    size: DEFAULT_COLUMN_WIDTH,
    minSize: DEFAULT_MIN_COLUMN_WIDTH
  }))
}
