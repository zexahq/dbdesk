'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import { TableCell } from '@renderer/components/ui/table'
import { cn } from '@renderer/lib/utils'
import * as React from 'react'

import type { DataTableCellProps } from '../data-table-cell.types'
import { areCellPropsEqual, useDataTableCellContext } from './base'

function parseBooleanString(value: 'true' | 'false' | 'null'): boolean | null {
  if (value === 'null') return null
  return value === 'true'
}

function BooleanDataTableCellInner<TData, TValue>(props: DataTableCellProps<TData, TValue>) {
  const {
    tableCellProps,
    renderedCell,
    isEditing,
    rowIndex,
    columnId,
    tableContainerRef
  } = useDataTableCellContext(props)

  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    setOpen(isEditing)
  }, [isEditing])

  const restoreFocus = React.useCallback(() => {
    setTimeout(() => {
      tableContainerRef.current?.focus()
    }, 0)
  }, [tableContainerRef])

  const handleValueChange = React.useCallback(
    (value: 'true' | 'false' | 'null') => {
      props.onDataUpdate({
        rowIndex,
        columnId,
        value: parseBooleanString(value)
      })
      props.onCellEditingStop()
      setOpen(false)
      restoreFocus()
    },
    [props, rowIndex, columnId, restoreFocus]
  )

  const handleOpenChange = React.useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen)
      if (!isOpen && isEditing) {
        props.onCellEditingStop()
        restoreFocus()
      }
    },
    [isEditing, props, restoreFocus]
  )

  return (
    <TableCell {...tableCellProps} className={cn(tableCellProps.className, 'cursor-pointer', isEditing && 'p-0!')}>
      {isEditing ? (
        <DropdownMenu open={open} onOpenChange={handleOpenChange}>
          <DropdownMenuTrigger asChild>
            <div ref={triggerRef} className="w-full h-full px-2 py-1.5 text-sm cursor-pointer" />
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="start" 
            className="rounded-none p-0" 
            sideOffset={15}
            style={{ width: triggerRef.current?.offsetWidth }}
          >
            <DropdownMenuItem
              className="cursor-pointer rounded-none"
              onSelect={() => handleValueChange('true')}
            >
              true
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer rounded-none"
              onSelect={() => handleValueChange('false')}
            >
              false
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer rounded-none"
              onSelect={() => handleValueChange('null')}
            >
              null
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        renderedCell
      )}
    </TableCell>
  )
}

export const BooleanDataTableCell = React.memo(
  BooleanDataTableCellInner,
  areCellPropsEqual
) as typeof BooleanDataTableCellInner
