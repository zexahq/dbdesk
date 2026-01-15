import type { ColumnDefinition, TableInfo } from '@common/types'
import { DATA_TYPES } from '@common/constants'
import { PlusIcon, Trash2Icon, MoreVerticalIcon } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { showWarning } from '@renderer/lib/toast'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@renderer/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@renderer/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'

interface TableDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  schema: string
  existingTable?: TableInfo
  onSubmit: (tableName: string, columns: ColumnDefinition[]) => void
  isPending?: boolean
}

export const TableDrawer = ({
  open,
  onOpenChange,
  mode,
  schema,
  existingTable,
  onSubmit,
  isPending = false
}: TableDrawerProps) => {
  const [tableName, setTableName] = useState('')
  const [columns, setColumns] = useState<ColumnDefinition[]>([
    { name: 'id', type: 'INT', nullable: false, isPrimaryKey: true, autoIncrement: true }
  ])
  const [editingForeignKey, setEditingForeignKey] = useState<number | null>(null)
  const [isScrollable, setIsScrollable] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (mode === 'edit' && existingTable) {
      setTableName(existingTable.name)
      setColumns(
        existingTable.columns.map((col) => ({
          name: col.name,
          type: col.type,
          nullable: col.nullable,
          defaultValue: col.defaultValue?.toString(),
          isPrimaryKey: col.isPrimaryKey,
          isUnique: false,
          autoIncrement: false
        }))
      )
    } else if (mode === 'create') {
      setTableName('')
      setColumns([])
    }
  }, [mode, existingTable, open])

  useEffect(() => {
    const checkScrollable = () => {
      if (scrollContainerRef.current) {
        const { scrollHeight, clientHeight } = scrollContainerRef.current
        setIsScrollable(scrollHeight > clientHeight)
      }
    }

    checkScrollable()
    // Recheck when columns change
    const timer = setTimeout(checkScrollable, 100)
    return () => clearTimeout(timer)
  }, [columns])

  const addColumn = () => {
    // Find a unique column name that doesn't conflict with existing ones (case-insensitive)
    let newColumnName = `column_${columns.length + 1}`
    let counter = 1
    const existingNames = columns.map((c) => c.name.toLowerCase())
    while (existingNames.includes(newColumnName.toLowerCase())) {
      counter++
      newColumnName = `column_${counter}`
    }

    setColumns([
      ...columns,
      {
        name: newColumnName,
        type: '',
        nullable: true,
        isPrimaryKey: false
      }
    ])
  }

  const removeColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index))
  }

  const updateColumn = (index: number, field: keyof ColumnDefinition, value: unknown) => {
    // Prevent duplicate column names (case-insensitive)
    if (field === 'name' && typeof value === 'string') {
      const lowerValue = value.toLowerCase()
      const isDuplicate = columns.some(
        (col, colIndex) => colIndex !== index && col.name.toLowerCase() === lowerValue
      )
      if (isDuplicate) {
        showWarning('Duplicate column name', `A column named "${value}" already exists`)
        return
      }
    }

    const newColumns = [...columns]
    newColumns[index] = { ...newColumns[index], [field]: value }

    // Auto-enable autoIncrement for id columns with INT type
    if (field === 'name' && value === 'id' && newColumns[index].type.toUpperCase().includes('INT')) {
      newColumns[index].autoIncrement = true
      newColumns[index].isPrimaryKey = true
      newColumns[index].nullable = false
    }

    // Auto-enable autoIncrement when changing type to INT on id column
    if (field === 'type' && newColumns[index].name === 'id' && String(value).toUpperCase().includes('INT')) {
      newColumns[index].autoIncrement = true
      newColumns[index].isPrimaryKey = true
      newColumns[index].nullable = false
    }

    setColumns(newColumns)
  }

  const handleSubmit = () => {
    if (!tableName.trim() || columns.length === 0) {
      return
    }
    onSubmit(tableName.trim(), columns)
  }

  // Check for duplicate column names (case-insensitive)
  const hasDuplicateColumns = (() => {
    const names = columns.map((c) => c.name.toLowerCase())
    return names.length !== new Set(names).size
  })()

  const isValid = tableName.trim() !== '' && columns.length > 0 && columns.every((col) => col.name.trim() !== '') && !hasDuplicateColumns

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto [&>button]:hidden focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
        <SheetHeader className="pb-4">
          <SheetTitle>{mode === 'create' ? 'Create New Table' : 'Edit Table'}</SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground opacity-50">
            {mode === 'create'
              ? `Create a new table in the ${schema} schema`
              : `Modify the structure of table ${schema}.${existingTable?.name}`}
          </SheetDescription>
          <div className="w-3/4 border-t border-border" />
        </SheetHeader>

        <div className="flex flex-col gap-6 pb-4 px-6">
          {/* Table Name */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="table-name" className="text-sm font-medium">
              Table Name
            </Label>
            <Input
              id="table-name"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="Enter table name"
              disabled={mode === 'edit' || isPending}
              className="h-9 ring-0! outline-none! border-border focus:border-white! focus-visible:border-white! transition"
            />
          </div>

          {/* Columns */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Columns</Label>
              <Button onClick={addColumn} variant="outline" size="sm" disabled={isPending}>
                <PlusIcon className="mr-2 size-4" />
                Add Column
              </Button>
            </div>

            <div className="relative">
              <div ref={scrollContainerRef} className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-2 pb-6">
                {columns.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <p className="text-sm">{'No columns added yet'}</p>
                    <p className="text-xs mt-1">{'Click "Add Column" to get started'}</p>
                  </div>
                ) : (
                  columns.map((column, index) => (

                <div
                  key={index}
                  className="flex flex-col gap-3 rounded-md border border-border bg-muted/30 p-3"
                >
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        value={column.name}
                        onChange={(e) => updateColumn(index, 'name', e.target.value)}
                        placeholder="Column name"
                        disabled={isPending}
                        className="h-9 border-border focus:border-white! focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:ring-offset-0"
                      />
                    </div>
                    <div className="w-40">
                      <Select
                        value={
                          DATA_TYPES.find((t) => t.value.toLowerCase() === column.type.toLowerCase())?.value || ''
                        }
                        onValueChange={(value) => updateColumn(index, 'type', value)}
                        disabled={isPending}
                      >
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue placeholder="Select data type" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[400px]">
                          {DATA_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <Input
                        value={column.defaultValue || ''}
                        onChange={(e) => updateColumn(index, 'defaultValue', e.target.value)}
                        placeholder={(column.type.toUpperCase().includes('TIMESTAMP') || column.type.toUpperCase().includes('DATE')) ? "CURRENT_TIMESTAMP" : "Default value"}
                        disabled={isPending}
                        className="h-9 border-border focus:border-white! focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:ring-offset-0"
                      />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" disabled={isPending} className="h-9">
                          <MoreVerticalIcon className="mr-2 size-4" />
                          {/* Column Options */}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuCheckboxItem
                          checked={column.nullable !== false}
                          onCheckedChange={(checked) =>
                            updateColumn(index, 'nullable', checked === true)
                          }
                          disabled={isPending}
                        >
                          Nullable
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={column.isPrimaryKey === true}
                          onCheckedChange={(checked) =>
                            updateColumn(index, 'isPrimaryKey', checked === true)
                          }
                          disabled={isPending}
                        >
                          Primary Key
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={column.isUnique === true}
                          onCheckedChange={(checked) => updateColumn(index, 'isUnique', checked === true)}
                          disabled={isPending}
                        >
                          Unique
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={column.autoIncrement === true}
                          onCheckedChange={(checked) => {
                            const newColumns = [...columns]
                            newColumns[index] = { ...newColumns[index], autoIncrement: checked === true }
                            // Suggest IDENTITY type if auto-increment is enabled
                            if (checked && !column.type.toUpperCase().includes('IDENTITY')) {
                              newColumns[index].type = 'INTEGER IDENTITY'
                            }
                            setColumns(newColumns)
                          }}
                          disabled={isPending}
                        >
                          Auto-Generate
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setEditingForeignKey(index)}
                          disabled={isPending}
                        >
                          {column.foreignKey ? 'Edit Foreign Key' : 'Add Foreign Key'}
                        </DropdownMenuItem>
                        {column.foreignKey && (
                          <DropdownMenuItem
                            onClick={() => {
                              const newColumns = [...columns]
                              delete newColumns[index].foreignKey
                              setColumns(newColumns)
                            }}
                            disabled={isPending}
                            className="text-destructive"
                          >
                            Remove Foreign Key
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      onClick={() => removeColumn(index)}
                      variant="ghost"
                      size="icon"
                      disabled={isPending}
                      className="h-9 w-9"
                    >
                      <Trash2Icon className="size-4" />
                      <span className="sr-only">Remove column</span>
                    </Button>
                  </div>

                  {editingForeignKey === index ? (
                    <div className="flex flex-col gap-2 p-2 bg-muted/50 rounded border border-border">
                      <div className="text-xs font-medium text-muted-foreground">Foreign Key Reference</div>
                      <div className="flex gap-2">
                        <Input
                          value={column.foreignKey?.table || ''}
                          onChange={(e) => {
                            const newColumns = [...columns]
                            newColumns[index].foreignKey = {
                              ...newColumns[index].foreignKey,
                              table: e.target.value,
                              column: newColumns[index].foreignKey?.column || 'id'
                            }
                            setColumns(newColumns)
                          }}
                          placeholder="Referenced table"
                          disabled={isPending}
                          className="h-8 text-xs border-border focus:border-white! focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:ring-offset-0"
                        />
                        <Input
                          value={column.foreignKey?.column || 'id'}
                          onChange={(e) => {
                            const newColumns = [...columns]
                            newColumns[index].foreignKey = {
                              ...newColumns[index].foreignKey!,
                              column: e.target.value
                            }
                            setColumns(newColumns)
                          }}
                          placeholder="Referenced column"
                          disabled={isPending}
                          className="h-8 text-xs border-border focus:border-white! focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:ring-offset-0"
                        />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Select
                            value={column.foreignKey?.onDelete || 'NO ACTION'}
                            onValueChange={(value) => {
                              const newColumns = [...columns]
                              newColumns[index].foreignKey = {
                                ...newColumns[index].foreignKey!,
                                onDelete: value as 'CASCADE' | 'RESTRICT' | 'SET NULL' | 'SET DEFAULT' | 'NO ACTION'
                              }
                              setColumns(newColumns)
                            }}
                            disabled={isPending}
                          >
                            <SelectTrigger className="h-8 text-xs w-full">
                              <SelectValue placeholder="On Delete" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CASCADE">ON DELETE CASCADE</SelectItem>
                              <SelectItem value="RESTRICT">ON DELETE RESTRICT</SelectItem>
                              <SelectItem value="SET NULL">ON DELETE SET NULL</SelectItem>
                              <SelectItem value="NO ACTION">ON DELETE NO ACTION</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1">
                          <Select
                            value={column.foreignKey?.onUpdate || 'NO ACTION'}
                            onValueChange={(value) => {
                              const newColumns = [...columns]
                              newColumns[index].foreignKey = {
                                ...newColumns[index].foreignKey!,
                                onUpdate: value as 'CASCADE' | 'RESTRICT' | 'SET NULL' | 'SET DEFAULT' | 'NO ACTION'
                              }
                              setColumns(newColumns)
                            }}
                            disabled={isPending}
                          >
                            <SelectTrigger className="h-8 text-xs w-full">
                              <SelectValue placeholder="On Update" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CASCADE">ON UPDATE CASCADE</SelectItem>
                              <SelectItem value="RESTRICT">ON UPDATE RESTRICT</SelectItem>
                              <SelectItem value="SET NULL">ON UPDATE SET NULL</SelectItem>
                              <SelectItem value="NO ACTION">ON UPDATE NO ACTION</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button
                        onClick={() => setEditingForeignKey(null)}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                      >
                        Done
                      </Button>
                    </div>
                  ) : column.foreignKey ? (
                    <div className="text-xs text-muted-foreground bg-blue-500/10 border border-blue-500/30 rounded px-2 py-1">
                      FK → {column.foreignKey.table}.{column.foreignKey.column}
                      {column.foreignKey.onDelete && column.foreignKey.onDelete !== 'NO ACTION' && (
                        <span className="ml-2">ON DELETE {column.foreignKey.onDelete}</span>
                      )}
                    </div>
                  ) : null}
                </div>
                  ))
                )}
              </div>
              {/* Fade out overlay at the bottom - only shown when content is scrollable */}
              {isScrollable && (
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-linear-to-t from-background to-transparent pointer-events-none" />
              )}
            </div>
          </div>
        </div>

        <SheetFooter className="gap-2">
          <SheetClose asChild>
            <Button variant="outline" disabled={isPending} className="h-9">
              Cancel
            </Button>
          </SheetClose>
          <Button onClick={handleSubmit} disabled={!isValid || isPending} className="h-9">
            {isPending ? 'Saving...' : mode === 'create' ? 'Create Table' : 'Update Table'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
