import { POSTGRES_DATA_TYPES, MYSQL_DATA_TYPES } from '@common/utils'
import type { ColumnDefinition, DatabaseType } from '@common/types'
import { Button } from '@renderer/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { Sheet, SheetClose, SheetContent, SheetFooter } from '@renderer/components/ui/sheet'
import { showWarning } from '@renderer/lib/toast'
import { MoreVerticalIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { useEffect, useState } from 'react'

interface AddTableSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  schema: string
  onSubmit: (tableName: string, columns: ColumnDefinition[]) => void
  isPending?: boolean
  databaseType: DatabaseType
}

export const AddTableSheet = ({
  open,
  onOpenChange,
  schema,
  onSubmit,
  isPending = false,
  databaseType
}: AddTableSheetProps) => {
  const [tableName, setTableName] = useState('')
  const [columns, setColumns] = useState<ColumnDefinition[]>([
    { name: 'id', type: 'INT', nullable: false, isPrimaryKey: true }
  ])
  const [editingForeignKey, setEditingForeignKey] = useState<number | null>(null)

  const DATA_TYPES = databaseType === 'postgres' ? POSTGRES_DATA_TYPES : MYSQL_DATA_TYPES

  useEffect(() => {
    if (open) {
      setTableName('')
      setColumns([{ name: 'id', type: 'INT', nullable: false, isPrimaryKey: true }])
    }
  }, [open])

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

  const isValid =
    tableName.trim() !== '' &&
    columns.length > 0 &&
    columns.every((col) => col.name.trim() !== '') &&
    !hasDuplicateColumns

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-3xl [&>button]:hidden gap-0">
        {/* Section 1: Header + Table Name */}
        <div className="flex flex-col border-b">
          <div className="flex items-center justify-between px-6 py-4">
            <h2 className="text-lg font-semibold">Create New Table</h2>
            <span className="text-sm text-muted-foreground">
              Schema: <span className="font-medium">{schema}</span>
            </span>
          </div>
          <div className="flex flex-col gap-2 px-6 pb-4">
            <Label htmlFor="table-name" className="text-sm font-medium">
              Table Name
            </Label>
            <Input
              id="table-name"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="Enter table name"
              disabled={isPending}
              className="h-9 ring-0! outline-none! border-border focus:border-white! focus-visible:border-white! transition"
            />
          </div>
        </div>

        {/* Section 2: Columns (scrollable) */}
        <div className="relative flex-1 overflow-y-auto">
          <div className="flex flex-col gap-4 px-6 pt-6">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Columns</Label>
              <Button onClick={addColumn} variant="outline" size="sm" disabled={isPending}>
                <PlusIcon className="mr-2 size-4" />
                Add Column
              </Button>
            </div>

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
                    <div className="w-50">
                      <Select
                        value={
                          DATA_TYPES.find(
                            (t) => t.value.toLowerCase() === column.type.toLowerCase()
                          )?.value || ''
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
                        placeholder={
                          column.type.toUpperCase().includes('TIMESTAMP') ||
                          column.type.toUpperCase().includes('DATE')
                            ? 'CURRENT_TIMESTAMP'
                            : 'Default value'
                        }
                        disabled={isPending}
                        className="h-9 border-border focus:border-white! focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:ring-offset-0"
                      />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={isPending} className="h-9">
                          <MoreVerticalIcon className="size-4" />
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
                          onCheckedChange={(checked) =>
                            updateColumn(index, 'isUnique', checked === true)
                          }
                          disabled={isPending}
                        >
                          Unique
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
                      <div className="text-xs font-medium text-muted-foreground">
                        Foreign Key Reference
                      </div>
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
                                onDelete: value as
                                  | 'CASCADE'
                                  | 'RESTRICT'
                                  | 'SET NULL'
                                  | 'SET DEFAULT'
                                  | 'NO ACTION'
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
                                onUpdate: value as
                                  | 'CASCADE'
                                  | 'RESTRICT'
                                  | 'SET NULL'
                                  | 'SET DEFAULT'
                                  | 'NO ACTION'
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
          {/* Bottom fade anchored to footer's top border */}
          <div
            aria-hidden
            className="pointer-events-none sticky bottom-0 z-10 h-14 w-full bg-linear-to-b from-background/0 via-background/70 to-background"
          />
        </div>

        {/* Section 3: Footer (Submit + Cancel) */}
        <SheetFooter className="flex flex-row items-center justify-end gap-2 border-t p-4">
          <SheetClose asChild>
            <Button variant="outline" disabled={isPending} className="h-9">
              Cancel
            </Button>
          </SheetClose>
          <Button onClick={handleSubmit} disabled={!isValid || isPending} className="h-9">
            {isPending ? 'Saving...' : 'Create Table'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
