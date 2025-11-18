'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { TableCell } from '@renderer/components/ui/table'
import { cn } from '@renderer/lib/utils'
import * as React from 'react'

import type { DataTableCellProps } from '../data-table-cell.types'
import { useDataTableCellContext } from './base'

type BooleanStringValue = 'true' | 'false' | 'null'

function normalizeBoolean(value: unknown): BooleanStringValue {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') {
    if (value === 0) return 'false'
    if (value === 1) return 'true'
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', 't', '1', 'yes'].includes(normalized)) return 'true'
    if (['false', 'f', '0', 'no'].includes(normalized)) return 'false'
  }
  return 'null'
}

function parseBooleanString(value: BooleanStringValue): boolean | null {
  if (value === 'null') return null
  return value === 'true'
}

export function BooleanDataTableCell<TData, TValue>(props: DataTableCellProps<TData, TValue>) {
  const {
    tableCellProps,
    renderedCell,
    isEditing,
    rowIndex,
    columnId,
    tableContainerRef,
    cellValue
  } = useDataTableCellContext(props)

  const [value, setValue] = React.useState<BooleanStringValue>(normalizeBoolean(cellValue))
  const [open, setOpen] = React.useState(false)
  const isCommittingRef = React.useRef(false)

  React.useEffect(() => {
    setValue(normalizeBoolean(cellValue))
  }, [cellValue])

  React.useEffect(() => {
    setOpen(isEditing)
  }, [isEditing])

  const restoreFocus = React.useCallback(() => {
    setTimeout(() => {
      tableContainerRef.current?.focus()
    }, 0)
  }, [tableContainerRef])

  const handleValueChange = React.useCallback(
    (nextValue: BooleanStringValue) => {
      isCommittingRef.current = true
      setValue(nextValue)
      props.onDataUpdate({
        rowIndex,
        columnId,
        value: parseBooleanString(nextValue)
      })
      props.onCellEditingStop()
      restoreFocus()
    },
    [props, rowIndex, columnId, restoreFocus]
  )

  const handleOpenChange = React.useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen)
      if (isCommittingRef.current) {
        isCommittingRef.current = false
        return
      }
      if (!isOpen && isEditing) {
        props.onCellEditingStop()
        restoreFocus()
      }
    },
    [isEditing, props, restoreFocus]
  )

  const displayLabel = value === 'null' ? '' : value === 'true' ? 'True' : 'False'

  return (
    <TableCell {...tableCellProps} className={cn(tableCellProps.className, 'cursor-pointer')}>
      {isEditing ? (
        <Select
          value={value}
          open={open}
          onOpenChange={handleOpenChange}
          onValueChange={(v) => handleValueChange(v as BooleanStringValue)}
        >
          <SelectTrigger
            size="sm"
            className="h-7 w-full justify-start border-none bg-transparent p-0 text-sm shadow-none focus-visible:ring-0 data-placeholder:text-muted-foreground [&_svg]:hidden"
          >
            <SelectValue placeholder="Select value" />
          </SelectTrigger>
          <SelectContent align="start" className="min-w-[140px]">
            <SelectItem value="true">True</SelectItem>
            <SelectItem value="false">False</SelectItem>
            <SelectItem value="null">Null</SelectItem>
          </SelectContent>
        </Select>
      ) : (
        (renderedCell ?? <span className="text-sm">{displayLabel}</span>)
      )}
    </TableCell>
  )
}
