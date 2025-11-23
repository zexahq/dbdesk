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

type ColumnMeta = {
  enumValues?: string[]
}

const NULL_VALUE = '__null__'

export function EnumDataTableCell<TData, TValue>(props: DataTableCellProps<TData, TValue>) {
  const {
    tableCellProps,
    isSelectColumn,
    isEditing,
    renderedCell,
    cellValue,
    rowIndex,
    columnId,
    tableContainerRef
  } = useDataTableCellContext(props)

  const columnMeta = (props.cell.column.columnDef.meta as ColumnMeta | undefined) ?? {}
  const enumValues = columnMeta.enumValues ?? []

  const [selectedValue, setSelectedValue] = React.useState<string>(
    cellValue === null ? NULL_VALUE : String(cellValue)
  )
  const [open, setOpen] = React.useState(false)
  const isCommittingRef = React.useRef(false)

  React.useEffect(() => {
    setOpen(isEditing)
  }, [isEditing])

  const restoreFocus = React.useCallback(() => {
    setTimeout(() => {
      tableContainerRef.current?.focus()
    }, 0)
  }, [tableContainerRef])

  const handleValueChange = React.useCallback(
    (value: string) => {
      isCommittingRef.current = true
      setSelectedValue(value)
      const parsedValue = value === NULL_VALUE ? null : value
      props.onDataUpdate({
        rowIndex,
        columnId,
        value: parsedValue
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

  return (
    <TableCell {...tableCellProps} className={cn(tableCellProps.className, 'cursor-pointer', isEditing && 'p-0!')}>
      {isEditing && !isSelectColumn ? (
        <Select
          value={selectedValue}
          open={open}
          onOpenChange={handleOpenChange}
          onValueChange={handleValueChange}
          defaultValue={cellValue === null ? NULL_VALUE : String(cellValue)}
        >
          <SelectTrigger
            size="sm"
            className="w-full justify-start border-none bg-transparent p-0 text-sm shadow-none focus-visible:ring-0 data-placeholder:text-muted-foreground [&_svg]:hidden px-2"
          >
            <SelectValue placeholder="Select value" />
          </SelectTrigger>
          <SelectContent align="start" className="rounded-none p-0" sideOffset={0}>
            <SelectItem value={NULL_VALUE} className="cursor-pointer rounded-none">NULL</SelectItem>
            {enumValues.map((enumValue) => (
              <SelectItem key={enumValue} value={enumValue} className="cursor-pointer rounded-none">
                {enumValue}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        renderedCell
      )}
    </TableCell>
  )
}
