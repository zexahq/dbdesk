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
    isRowSelected,
    focusedCell,
    editingCell,
    getIsCellSelected,
    getCellEdgeClasses,
    tableContainerRef,
    onCellClick,
    onCellDoubleClick,
    onCellMouseDown,
    onCellMouseEnter,
    onCellMouseUp
  } = props

  const cellRef = React.useRef<HTMLTableCellElement>(null)
  const isSelectColumn = columnId === 'select'
  const isFocused = focusedCell?.rowIndex === rowIndex && focusedCell?.columnId === columnId
  const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnId === columnId
  const isSelected = getIsCellSelected(rowIndex, columnId)

  const { edgeClasses, isEdgeCell, isInSelection } = getCellEdgeClasses(rowIndex, columnId)
  const hasSelectionBorder = isEdgeCell || isInSelection

  const cellValue = cell.getValue()
  const cellValueString = formatCellValue(cellValue)
  const dataType = (cell.column.columnDef.meta as { dataType?: string } | undefined)?.dataType
  const editorLanguage = getEditorLanguage(dataType)
  const renderedCell = flexRender(cell.column.columnDef.cell, cell.getContext())

  const allowCellInteraction = !isSelectColumn && !isEditing

  const tableCellProps: React.ComponentProps<typeof TableCell> & {
    'data-column-id'?: string
  } = {
    ref: cellRef,
    'data-column-id': columnId,
    className: cn(
      !isInSelection && 'border-border border-x first:border-l last:border-r',
      'truncate bg-accent/50',
      !isSelectColumn && 'cursor-pointer',
      isFocused && !hasSelectionBorder && 'outline-2 outline-ring outline-offset-0',
      isSelected && !isFocused && !isRowSelected && 'bg-selected-cell',
      edgeClasses
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
      : undefined,
    onMouseDown: allowCellInteraction ? (e) => onCellMouseDown(rowIndex, columnId, e) : undefined,
    onMouseEnter: allowCellInteraction ? (e) => onCellMouseEnter(rowIndex, columnId, e) : undefined,
    onMouseUp: allowCellInteraction ? onCellMouseUp : undefined
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
    isSelected,
    hasSelectionBorder,
    tableCellProps,
    rowIndex,
    columnId,
    tableContainerRef
  }
}
