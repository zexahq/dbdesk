'use client'

import { TableCell } from '@renderer/components/ui/table'
import { cn } from '@renderer/lib/utils'
import type { NavigationDirection } from '@renderer/types/data-table'
import { format } from 'date-fns'
import * as React from 'react'

import type { DataTableCellProps } from '../data-table-cell.types'
import { areCellPropsEqual, useDataTableCellContext } from './base'

function DateTimeDataTableCellInner<TData, TValue>(props: DataTableCellProps<TData, TValue>) {
  const {
    tableCellProps,
    renderedCell,
    isEditing,
    rowIndex,
    columnId,
    tableContainerRef,
    cellValueString,
    cellValue,
    dataType
  } = useDataTableCellContext(props)

  const [value, setValue] = React.useState(cellValueString)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (isEditing) {
      let nextValue = ''
      if (cellValue instanceof Date) {
        const isTimezoneAware =
          dataType?.includes('with time zone') ||
          dataType?.includes('tz') ||
          dataType === 'timestamptz' ||
          dataType === 'timetz'

        const formatString = isTimezoneAware
          ? 'yyyy-MM-dd HH:mm:ss.SSSxxx'
          : 'yyyy-MM-dd HH:mm:ss.SSS'

        try {
          nextValue = format(cellValue, formatString)
        } catch {
          nextValue = cellValue.toISOString()
        }
      } else if (cellValue !== null && cellValue !== undefined) {
        nextValue = String(cellValue)
      }
      setValue(nextValue)
      requestAnimationFrame(() => inputRef.current?.focus())
    } else {
      setValue(cellValueString)
    }
  }, [isEditing, cellValue, cellValueString, dataType])

  const restoreFocus = React.useCallback(() => {
    setTimeout(() => {
      tableContainerRef.current?.focus()
    }, 0)
  }, [tableContainerRef])

  const commitValue = React.useCallback(
    (nextValue: string, opts?: { moveToNextRow?: boolean; direction?: NavigationDirection }) => {
      const trimmed = nextValue.trim()
      const hasChanged = trimmed !== cellValueString

      if (hasChanged) {
        props.onDataUpdate({
          rowIndex,
          columnId,
          value: trimmed === '' ? null : trimmed
        })
      }

      props.onCellEditingStop(opts)
      restoreFocus()
    },
    [cellValueString, props, rowIndex, columnId, restoreFocus]
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
          autoFocus
        />
      ) : (
        renderedCell
      )}
    </TableCell>
  )
}

export const DateTimeDataTableCell = React.memo(
  DateTimeDataTableCellInner,
  areCellPropsEqual
) as typeof DateTimeDataTableCellInner
