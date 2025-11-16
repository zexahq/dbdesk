'use client'

import { BasicEditor } from '@renderer/components/editor/basic-editor'
import { Button } from '@renderer/components/ui/button'
import { Popover, PopoverAnchor, PopoverContent } from '@renderer/components/ui/popover'
import { TableCell } from '@renderer/components/ui/table'
import { formatCellValue, getEditorLanguage } from '@renderer/lib/data-table'
import { cn } from '@renderer/lib/utils'
import type { CellPosition, NavigationDirection, UpdateCell } from '@renderer/types/data-table'
import { flexRender, type Cell } from '@tanstack/react-table'
import { Maximize2 } from 'lucide-react'
import * as React from 'react'
import { CellEditorSheet } from './cell-editor-sheet'

interface DataTableCellProps<TData, TValue> {
  cell: Cell<TData, TValue>
  rowIndex: number
  columnId: string
  isRowSelected: boolean
  focusedCell: CellPosition | null
  editingCell: CellPosition | null
  getIsCellSelected: (rowIndex: number, columnId: string) => boolean
  getCellEdgeClasses: (
    rowIndex: number,
    columnId: string
  ) => {
    edgeClasses: string
    isEdgeCell: boolean
    isInSelection: boolean
  }
  onCellClick: (rowIndex: number, columnId: string, e: React.MouseEvent) => void
  onCellDoubleClick: (rowIndex: number, columnId: string, e: React.MouseEvent) => void
  onCellMouseDown: (rowIndex: number, columnId: string, e: React.MouseEvent) => void
  onCellMouseEnter: (rowIndex: number, columnId: string, e: React.MouseEvent) => void
  onCellMouseUp: () => void
  onCellEditingStop: (opts?: { moveToNextRow?: boolean; direction?: NavigationDirection }) => void
  onDataUpdate: (updates: UpdateCell | Array<UpdateCell>) => void
}

export function DataTableCell<TData, TValue>({
  cell,
  rowIndex,
  columnId,
  isRowSelected,
  focusedCell,
  editingCell,
  getIsCellSelected,
  getCellEdgeClasses,
  onCellClick,
  onCellDoubleClick,
  onCellMouseDown,
  onCellMouseEnter,
  onCellMouseUp,
  onCellEditingStop,
  onDataUpdate
}: DataTableCellProps<TData, TValue>) {
  const cellRef = React.useRef<HTMLTableCellElement>(null)
  const [editorValue, setEditorValue] = React.useState('')
  const [isSheetOpen, setIsSheetOpen] = React.useState(false)
  const isClosingRef = React.useRef(false)
  const isSavingRef = React.useRef(false)
  const isSelectColumn = columnId === 'select'
  const isFocused = focusedCell?.rowIndex === rowIndex && focusedCell?.columnId === columnId
  const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnId === columnId
  const isSelected = getIsCellSelected(rowIndex, columnId)
  const { edgeClasses, isEdgeCell, isInSelection } = getCellEdgeClasses(rowIndex, columnId)
  const hasSelectionBorder = isEdgeCell || isInSelection

  // Reset closing flags when editing state changes
  React.useEffect(() => {
    if (isEditing) {
      isClosingRef.current = false
      isSavingRef.current = false
    } else {
      setIsSheetOpen(false)
    }
  }, [isEditing])

  // Get editor language from column metadata
  const dataType = (cell.column.columnDef.meta as { dataType?: string } | undefined)?.dataType
  const editorLanguage = getEditorLanguage(dataType)

  // Initialize editor value when editing starts
  React.useEffect(() => {
    if (isEditing) {
      const cellValue = cell.getValue()
      setEditorValue(formatCellValue(cellValue))
    }
  }, [isEditing, cell])

  const handleSave = () => {
    if (!isEditing) return

    // Parse the value back to the original type if it was JSON
    let parsedValue: unknown = editorValue
    const originalValue = cell.getValue()

    // If original value was an object, try to parse the editor value as JSON
    if (typeof originalValue === 'object' && originalValue !== null) {
      try {
        parsedValue = JSON.parse(editorValue)
      } catch {
        // If parsing fails, keep as string
        parsedValue = editorValue
      }
    } else if (editorValue === '') {
      parsedValue = null
    }

    isSavingRef.current = true
    onDataUpdate({
      rowIndex,
      columnId,
      value: parsedValue
    })
    onCellEditingStop()
    setIsSheetOpen(false)
  }

  const handleCancel = () => {
    if (isClosingRef.current || isSavingRef.current) return
    isClosingRef.current = true
    onCellEditingStop()
    setIsSheetOpen(false)
  }

  const cellValue = cell.getValue()
  const cellValueString = formatCellValue(cellValue)

  const handleOpenChange = (open: boolean) => {
    if (!open && isEditing && !isSavingRef.current) {
      handleCancel()
      setIsSheetOpen(false)
    }
  }

  const handleExpand = () => {
    setIsSheetOpen(true)
  }

  const handleSheetOpenChange = (open: boolean) => {
    setIsSheetOpen(open)
    if (!open && isEditing && !isSavingRef.current) {
      handleCancel()
    }
  }

  return (
    <>
      <Popover open={isEditing && !isSelectColumn && !isSheetOpen} onOpenChange={handleOpenChange}>
        <PopoverAnchor asChild>
          <TableCell
            ref={cellRef}
            className={cn(
              // Default borders - remove on cells that are part of selection
              !isInSelection && 'border-border border-x first:border-l last:border-r',
              'truncate bg-accent/50',
              !isSelectColumn && 'cursor-pointer',
              // Only show outline on focused cell if there's no selection border
              isFocused && !hasSelectionBorder && 'outline-2 outline-ring outline-offset-0',
              isSelected && !isFocused && !isRowSelected && 'bg-selected-cell',
              edgeClasses
            )}
            style={{
              width: cell.column.getSize(),
              minWidth: cell.column.columnDef.minSize,
              maxWidth: cell.column.getSize()
            }}
            title={cellValueString}
            onClick={isSelectColumn ? undefined : (e) => onCellClick(rowIndex, columnId, e)}
            onDoubleClick={
              isSelectColumn ? undefined : (e) => onCellDoubleClick(rowIndex, columnId, e)
            }
            onMouseDown={isSelectColumn ? undefined : (e) => onCellMouseDown(rowIndex, columnId, e)}
            onMouseEnter={
              isSelectColumn ? undefined : (e) => onCellMouseEnter(rowIndex, columnId, e)
            }
            onMouseUp={isSelectColumn ? undefined : onCellMouseUp}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        </PopoverAnchor>
        {isEditing && !isSelectColumn && (
          <PopoverContent
            className="w-[300px] p-0"
            align="start"
            side="bottom"
            sideOffset={4}
            onOpenAutoFocus={(e) => e.preventDefault()}
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
                  <span>Save changes</span>
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
