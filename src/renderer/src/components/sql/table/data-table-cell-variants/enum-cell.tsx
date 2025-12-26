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

type ColumnMeta = {
  enumValues?: string[]
}

function EnumDataTableCellInner<TData, TValue>(props: DataTableCellProps<TData, TValue>) {
  const {
    tableCellProps,
    isSelectColumn,
    isEditing,
    renderedCell,
    rowIndex,
    columnId,
    tableContainerRef
  } = useDataTableCellContext(props)

  const columnMeta = (props.cell.column.columnDef.meta as ColumnMeta | undefined) ?? {}
  const enumValues = columnMeta.enumValues ?? []

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
    (value: string | null) => {
      props.onDataUpdate({
        rowIndex,
        columnId,
        value
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
      {isEditing && !isSelectColumn ? (
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
              onSelect={() => handleValueChange(null)}
            >
              NULL
            </DropdownMenuItem>
            {enumValues.map((enumValue) => (
              <DropdownMenuItem
                key={enumValue}
                className="cursor-pointer rounded-none"
                onSelect={() => handleValueChange(enumValue)}
              >
                {enumValue}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        renderedCell
      )}
    </TableCell>
  )
}

export const EnumDataTableCell = React.memo(
  EnumDataTableCellInner,
  areCellPropsEqual
) as typeof EnumDataTableCellInner
