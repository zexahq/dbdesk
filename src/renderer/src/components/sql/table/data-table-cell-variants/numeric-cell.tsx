'use client'

import { TableCell } from '@renderer/components/ui/table'
import { cn } from '@renderer/lib/utils'
import type { NavigationDirection } from '@renderer/types/data-table'
import * as React from 'react'

import type { DataTableCellProps } from '../data-table-cell.types'
import { areCellPropsEqual, useDataTableCellContext } from './base'

function normalizeNumericValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null
  }
  if (typeof value === 'number') {
    return Number.isNaN(value) ? null : value
  }
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

function parseNumericInput(value: string): number | null | undefined {
  const trimmed = value.trim()
  if (trimmed === '') return null
  if (trimmed === '-' || trimmed === '+') return undefined
  const parsed = Number(trimmed)
  return Number.isNaN(parsed) ? undefined : parsed
}

function NumericDataTableCellInner<TData, TValue>(props: DataTableCellProps<TData, TValue>) {
  const {
    tableCellProps,
    renderedCell,
    isEditing,
    rowIndex,
    columnId,
    tableContainerRef,
    cellValueString,
    cellValue
  } = useDataTableCellContext(props)

  const [value, setValue] = React.useState(cellValueString)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (isEditing) {
      const nextValue = cellValue === null || cellValue === undefined ? '' : String(cellValue ?? '')
      setValue(nextValue)
      requestAnimationFrame(() => inputRef.current?.focus())
    } else {
      setValue(cellValueString)
    }
  }, [isEditing, cellValue, cellValueString])

  const restoreFocus = React.useCallback(() => {
    setTimeout(() => {
      tableContainerRef.current?.focus()
    }, 0)
  }, [tableContainerRef])

  const commitValue = React.useCallback(
    (nextValue: string, opts?: { moveToNextRow?: boolean; direction?: NavigationDirection }) => {
      const parsed = parseNumericInput(nextValue)
      if (parsed === undefined) {
        setValue(cellValueString)
        props.onCellEditingStop(opts)
        restoreFocus()
        return
      }

      const originalNumeric = normalizeNumericValue(cellValue)
      const hasChanged =
        parsed !== originalNumeric && !(parsed === null && originalNumeric === null)

      if (hasChanged) {
        props.onDataUpdate({
          rowIndex,
          columnId,
          value: parsed
        })
      }

      props.onCellEditingStop(opts)
      restoreFocus()
    },
    [cellValue, cellValueString, props, rowIndex, columnId, restoreFocus]
  )

  const onInputBlur = React.useCallback(() => {
    commitValue(value)
  }, [commitValue, value])

  const onInputChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value)
  }, [])

  const onInputKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        commitValue(value, { moveToNextRow: true })
      } else if (event.key === 'Tab') {
        event.preventDefault()
        commitValue(value, { direction: event.shiftKey ? 'left' : 'right' })
      } else if (event.key === 'Escape') {
        event.preventDefault()
        setValue(cellValueString)
        props.onCellEditingStop()
        restoreFocus()
      }
    },
    [commitValue, value, cellValueString, props, restoreFocus]
  )

  return (
    <TableCell
      {...tableCellProps}
      className={cn(
        tableCellProps.className,
        isEditing ? 'cursor-text' : 'cursor-pointer',
        isEditing && 'bg-muted/10'
      )}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          value={value}
          onChange={onInputChange}
          onBlur={onInputBlur}
          onKeyDown={onInputKeyDown}
          className="w-full border-none bg-transparent p-0 text-sm outline-none"
          inputMode="decimal"
          autoFocus
        />
      ) : (
        renderedCell
      )}
    </TableCell>
  )
}

export const NumericDataTableCell = React.memo(
  NumericDataTableCellInner,
  areCellPropsEqual
) as typeof NumericDataTableCellInner
