'use client'

import { BasicEditor } from '@renderer/components/editor/basic-editor'
import { Button } from '@renderer/components/ui/button'
import { Popover, PopoverAnchor, PopoverContent } from '@renderer/components/ui/popover'
import { TableCell } from '@renderer/components/ui/table'
import { Maximize2 } from 'lucide-react'
import * as React from 'react'

import { CellEditorSheet } from '../cell-editor-sheet'
import type { DataTableCellProps } from '../data-table-cell.types'
import { useDataTableCellContext } from './base'

export function TextDataTableCell<TData, TValue>(props: DataTableCellProps<TData, TValue>) {
  const {
    tableCellProps,
    isSelectColumn,
    isEditing,
    renderedCell,
    editorLanguage,
    cellValueString,
    cellValue,
    rowIndex,
    columnId,
    tableContainerRef
  } = useDataTableCellContext(props)

  const [editorValue, setEditorValue] = React.useState(cellValue === null ? '' : cellValueString)
  const [isSheetOpen, setIsSheetOpen] = React.useState(false)
  const isClosingRef = React.useRef(false)
  const isSavingRef = React.useRef(false)

  React.useEffect(() => {
    if (isEditing) {
      isClosingRef.current = false
      isSavingRef.current = false
      setEditorValue(cellValue === null ? '' : cellValueString)
    } else {
      setIsSheetOpen(false)
    }
  }, [isEditing, cellValueString, cellValue])

  const restoreFocus = React.useCallback(() => {
    setTimeout(() => {
      tableContainerRef.current?.focus()
    }, 0)
  }, [tableContainerRef])

  const handleSave = React.useCallback(() => {
    if (!isEditing) return

    let parsedValue: unknown = editorValue
    if (typeof cellValue === 'object' && cellValue !== null) {
      try {
        parsedValue = JSON.parse(editorValue)
      } catch {
        parsedValue = editorValue
      }
    } else if (editorValue === '') {
      parsedValue = null
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
  }, [cellValue, editorValue, isEditing, props, rowIndex, columnId, restoreFocus])

  const handleCancel = React.useCallback(() => {
    if (isClosingRef.current || isSavingRef.current) return
    isClosingRef.current = true
    props.onCellEditingStop()
    setIsSheetOpen(false)
    restoreFocus()
  }, [props, restoreFocus])

  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open && isEditing && !isSavingRef.current) {
        handleCancel()
      }
    },
    [handleCancel, isEditing]
  )

  const handleExpand = React.useCallback(() => {
    setIsSheetOpen(true)
  }, [])

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
      <Popover open={isEditing && !isSelectColumn && !isSheetOpen} onOpenChange={handleOpenChange}>
        <PopoverAnchor asChild>
          <TableCell {...tableCellProps}>{renderedCell}</TableCell>
        </PopoverAnchor>
        {isEditing && !isSelectColumn && (
          <PopoverContent
            className="w-[300px] p-0"
            align="start"
            side="bottom"
            sideOffset={4}
            onOpenAutoFocus={(event) => event.preventDefault()}
          >
            <div className="flex flex-col">
              <div className="flex items-center justify-between border-b px-3 py-2 bg-muted/50">
                <span className="text-sm font-medium">Edit Cell</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExpand}
                  className="h-7 w-7 p-0 cursor-pointer"
                  title="Expand editor"
                >
                  <Maximize2 className="size-4" />
                </Button>
              </div>
              <div className="flex-1 min-h-0">
                <BasicEditor
                  value={editorValue}
                  onChange={setEditorValue}
                  onSave={handleSave}
                  onCancel={handleCancel}
                  height="300px"
                  language={editorLanguage}
                />
              </div>
              <div className="flex items-center justify-end gap-2 border-t p-2 bg-muted/50">
                <Button variant="outline" size="sm" onClick={handleCancel} className="gap-2">
                  <span>Cancel</span>
                </Button>
                <Button variant="default" size="sm" onClick={handleSave} className="gap-2">
                  <span>Save</span>
                </Button>
              </div>
            </div>
          </PopoverContent>
        )}
      </Popover>
      <CellEditorSheet
        open={isSheetOpen}
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
