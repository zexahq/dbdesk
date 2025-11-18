'use client'

import type { DataTableCellVariant } from '@renderer/lib/data-table'

import { BooleanDataTableCell } from './data-table-cell-variants/boolean-cell'
import { NumericDataTableCell } from './data-table-cell-variants/numeric-cell'
import { TextDataTableCell } from './data-table-cell-variants/text-cell'
import type { DataTableCellProps } from './data-table-cell.types'

type ColumnMeta = {
  dataType?: string
  name?: string
  variant?: DataTableCellVariant
}

export function DataTableCell<TData, TValue>(props: DataTableCellProps<TData, TValue>) {
  const columnMeta = (props.cell.column.columnDef.meta as ColumnMeta | undefined) ?? {}
  const variant = columnMeta.variant ?? 'text'

  switch (variant) {
    case 'numeric':
      return <NumericDataTableCell {...props} />
    case 'boolean':
      return <BooleanDataTableCell {...props} />
    default:
      return <TextDataTableCell {...props} />
  }
}
