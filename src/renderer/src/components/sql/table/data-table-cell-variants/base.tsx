'use client'

import type { TableCell } from '@renderer/components/ui/table'
import { formatCellValue, getEditorLanguage } from '@renderer/lib/data-table'
import { cn } from '@renderer/lib/utils'
import { flexRender } from '@tanstack/react-table'
import { useRef, useMemo, useCallback, type ComponentProps } from 'react'

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

  const cellRef = useRef<HTMLTableCellElement>(null)
  const isSelectColumn = columnId === 'select'

  // Memoize focus/edit state checks
  const isFocused = useMemo(
    () => focusedCell?.rowIndex === rowIndex && focusedCell?.columnId === columnId,
    [focusedCell?.rowIndex, focusedCell?.columnId, rowIndex, columnId]
  )

  const isEditing = useMemo(
    () => editingCell?.rowIndex === rowIndex && editingCell?.columnId === columnId,
    [editingCell?.rowIndex, editingCell?.columnId, rowIndex, columnId]
  )

  const cellValue = cell.getValue()
  const dataType = (cell.column.columnDef.meta as { dataType?: string } | undefined)?.dataType

  // Memoize expensive computations
  const cellValueString = useMemo(
    () => formatCellValue(cellValue, dataType),
    [cellValue, dataType]
  )

  const editorLanguage = useMemo(() => getEditorLanguage(dataType), [dataType])

  // Don't memoize for select column - it needs to re-render when row selection changes
  // For other columns, memoize based on cell reference
  const renderedCell = useMemo(
    () => flexRender(cell.column.columnDef.cell, cell.getContext()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    isSelectColumn ? [cell, cell.row.getIsSelected()] : [cell]
  )

  const allowCellInteraction = !isSelectColumn && !isEditing

  // Memoize click handlers
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (allowCellInteraction) {
        onCellClick(rowIndex, columnId, e)
      }
    },
    [allowCellInteraction, onCellClick, rowIndex, columnId]
  )

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (allowCellInteraction) {
        onCellDoubleClick(rowIndex, columnId, e)
      }
    },
    [allowCellInteraction, onCellDoubleClick, rowIndex, columnId]
  )

  // Memoize style object
  const cellStyle = useMemo(
    () => ({
      width: cell.column.getSize(),
      minWidth: cell.column.columnDef.minSize,
      maxWidth: cell.column.getSize()
    }),
    [cell.column]
  )

  // Memoize className
  const cellClassName = useMemo(
    () =>
      cn(
        'border-border border-x first:border-l last:border-r',
        'truncate bg-accent/50',
        !isSelectColumn && 'cursor-pointer',
        isFocused && '[box-shadow:inset_0_0_0_2px_white]'
      ),
    [isSelectColumn, isFocused]
  )

  const tableCellProps: ComponentProps<typeof TableCell> & {
    'data-column-id'?: string
  } = useMemo(
    () => ({
      ref: cellRef,
      'data-column-id': columnId,
      className: cellClassName,
      style: cellStyle,
      title: cellValueString,
      onClick: allowCellInteraction ? handleClick : undefined,
      onDoubleClick: allowCellInteraction ? handleDoubleClick : undefined
    }),
    [columnId, cellClassName, cellStyle, cellValueString, allowCellInteraction, handleClick, handleDoubleClick]
  )

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

// Helper to compare cell props for memoization
export function areCellPropsEqual<TData, TValue>(
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

  // If focus or editing state for THIS cell changed, re-render
  if (prevIsFocused !== nextIsFocused || prevIsEditing !== nextIsEditing) {
    return false
  }

  // Check if cell value changed
  if (prevProps.cell.getValue() !== nextProps.cell.getValue()) {
    return false
  }

  // Check if cell size changed
  if (prevProps.cell.column.getSize() !== nextProps.cell.column.getSize()) {
    return false
  }

  // Row index and column ID should be stable
  if (prevProps.rowIndex !== nextProps.rowIndex || prevProps.columnId !== nextProps.columnId) {
    return false
  }

  return true
}
