'use client'

import { TableCell } from '@renderer/components/ui/table'
import * as React from 'react'

import { CellEditorSheet } from '../cell-editor-sheet'
import type { DataTableCellProps } from '../data-table-cell.types'
import { useDataTableCellContext } from './base'

export function JsonDataTableCell<TData, TValue>(props: DataTableCellProps<TData, TValue>) {
  const {
    tableCellProps,
    renderedCell,
    editorLanguage,
    isEditing,
    cellValue,
    cellValueString,
    rowIndex,
    columnId,
    tableContainerRef
  } = useDataTableCellContext(props)

  const [editorValue, setEditorValue] = React.useState(cellValueString)
  const [isSheetOpen, setIsSheetOpen] = React.useState(false)
  const isSavingRef = React.useRef(false)

  React.useEffect(() => {
    if (isEditing) {
      isSavingRef.current = false
      setEditorValue(cellValueString || JSON.stringify(cellValue, null, 2))
      setIsSheetOpen(true)
    } else {
      setIsSheetOpen(false)
    }
  }, [isEditing, cellValue, cellValueString])

  const restoreFocus = React.useCallback(() => {
    setTimeout(() => {
      tableContainerRef.current?.focus()
    }, 0)
  }, [tableContainerRef])

  const handleSave = React.useCallback(() => {
    if (!isEditing) return
    let parsedValue: unknown = editorValue

    try {
      parsedValue = editorValue ? JSON.parse(editorValue) : null
    } catch {
      parsedValue = editorValue
    }

    isSavingRef.current = true
    props.onDataUpdate({
      rowIndex,
      columnId,
      value: parsedValue
    })
    props.onCellEditingStop()
    setIsSheetOpen(false)
    restoreFocus()
  }, [editorValue, isEditing, props, rowIndex, columnId, restoreFocus])

  const handleCancel = React.useCallback(() => {
    if (isSavingRef.current) return
    props.onCellEditingStop()
    setIsSheetOpen(false)
    restoreFocus()
  }, [props, restoreFocus])

  const handleSheetOpenChange = React.useCallback(
    (open: boolean) => {
      setIsSheetOpen(open)
      if (!open && isEditing && !isSavingRef.current) {
        handleCancel()
      }
    },
    [handleCancel, isEditing]
  )

  return (
    <>
      <TableCell {...tableCellProps}>{renderedCell}</TableCell>
      <CellEditorSheet
        open={isSheetOpen && isEditing}
        value={editorValue}
        language={editorLanguage}
        onOpenChange={handleSheetOpenChange}
        onChange={setEditorValue}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </>
  )
}
