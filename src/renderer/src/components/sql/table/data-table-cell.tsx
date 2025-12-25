'use client'

import type { DataTableCellVariant } from '@renderer/lib/data-table'
import * as React from 'react'

import { BooleanDataTableCell } from './data-table-cell-variants/boolean-cell'
import { DateTimeDataTableCell } from './data-table-cell-variants/date-time-cell'
import { EnumDataTableCell } from './data-table-cell-variants/enum-cell'
import { NumericDataTableCell } from './data-table-cell-variants/numeric-cell'
import { TextDataTableCell } from './data-table-cell-variants/text-cell'
import type { DataTableCellProps } from './data-table-cell.types'

type ColumnMeta = {
  dataType?: string
  name?: string
  variant?: DataTableCellVariant
  enumValues?: string[]
}

function DataTableCellInner<TData, TValue>(props: DataTableCellProps<TData, TValue>) {
  const columnMeta = (props.cell.column.columnDef.meta as ColumnMeta | undefined) ?? {}
  const variant = columnMeta.variant ?? 'text'

  switch (variant) {
    case 'numeric':
      return <NumericDataTableCell {...props} />
    case 'boolean':
      return <BooleanDataTableCell {...props} />
    case 'date':
      return <DateTimeDataTableCell {...props} />
    case 'enum':
      return <EnumDataTableCell {...props} />
    default:
      return <TextDataTableCell {...props} />
  }
}

function areCellPropsEqual<TData, TValue>(
  prevProps: DataTableCellProps<TData, TValue>,
  nextProps: DataTableCellProps<TData, TValue>
): boolean {
  // Select column: always re-render since row.getIsSelected() reads from shared table state
  // and comparing prev vs next would give the same value at comparison time
  if (prevProps.columnId === 'select') {
    return false
  }

  // Check if this cell's focus/edit state changed
  const prevIsFocused =
    prevProps.focusedCell?.rowIndex === prevProps.rowIndex &&
    prevProps.focusedCell?.columnId === prevProps.columnId
  const nextIsFocused =
    nextProps.focusedCell?.rowIndex === nextProps.rowIndex &&
    nextProps.focusedCell?.columnId === nextProps.columnId

  const prevIsEditing =
    prevProps.editingCell?.rowIndex === prevProps.rowIndex &&
    prevProps.editingCell?.columnId === prevProps.columnId
  const nextIsEditing =
    nextProps.editingCell?.rowIndex === nextProps.rowIndex &&
    nextProps.editingCell?.columnId === nextProps.columnId

  if (prevIsFocused !== nextIsFocused || prevIsEditing !== nextIsEditing) {
    return false
  }

  if (prevProps.cell.getValue() !== nextProps.cell.getValue()) {
    return false
  }

  if (prevProps.cell.column.getSize() !== nextProps.cell.column.getSize()) {
    return false
  }

  if (prevProps.rowIndex !== nextProps.rowIndex || prevProps.columnId !== nextProps.columnId) {
    return false
  }

  return true
}

export const DataTableCell = React.memo(
  DataTableCellInner,
  areCellPropsEqual
) as typeof DataTableCellInner
