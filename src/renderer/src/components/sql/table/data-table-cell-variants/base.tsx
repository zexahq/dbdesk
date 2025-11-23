'use client'

import { TableCell } from '@renderer/components/ui/table'
import { formatCellValue, getEditorLanguage } from '@renderer/lib/data-table'
import { cn } from '@renderer/lib/utils'
import { flexRender } from '@tanstack/react-table'
import * as React from 'react'

import type { DataTableCellProps } from '../data-table-cell.types'

export function useDataTableCellContext<TData, TValue>(props: DataTableCellProps<TData, TValue>) {
  const {
    cell,
    columnId,
    rowIndex,
    focusedCell,
    editingCell,
    tableContainerRef,
    onCellClick,
    onCellDoubleClick
  } = props

  const cellRef = React.useRef<HTMLTableCellElement>(null)
  const isSelectColumn = columnId === 'select'
  const isFocused = focusedCell?.rowIndex === rowIndex && focusedCell?.columnId === columnId
  const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnId === columnId

  const cellValue = cell.getValue()
  const dataType = (cell.column.columnDef.meta as { dataType?: string } | undefined)?.dataType
  const cellValueString = formatCellValue(cellValue, dataType)
  const editorLanguage = getEditorLanguage(dataType)
  const renderedCell = flexRender(cell.column.columnDef.cell, cell.getContext())

  const allowCellInteraction = !isSelectColumn && !isEditing

  const tableCellProps: React.ComponentProps<typeof TableCell> & {
    'data-column-id'?: string
  } = {
    ref: cellRef,
    'data-column-id': columnId,
    className: cn(
      'border-border border-x first:border-l last:border-r',
      'truncate bg-accent/50',
      !isSelectColumn && 'cursor-pointer',
      isFocused && 'outline-2 outline-ring outline-offset-0'
    ),
    style: {
      width: cell.column.getSize(),
      minWidth: cell.column.columnDef.minSize,
      maxWidth: cell.column.getSize()
    },
    title: cellValueString,
    onClick: allowCellInteraction ? (e) => onCellClick(rowIndex, columnId, e) : undefined,
    onDoubleClick: allowCellInteraction
      ? (e) => onCellDoubleClick(rowIndex, columnId, e)
      : undefined
  }

  return {
    cellRef,
    cellValue,
    cellValueString,
    dataType,
    editorLanguage,
    renderedCell,
    isSelectColumn,
    isFocused,
    isEditing,
    tableCellProps,
    rowIndex,
    columnId,
    tableContainerRef
  }
}
