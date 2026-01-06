import type { ColumnDefinition, TableInfo } from '@common/types'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@renderer/components/ui/sheet'
import { Checkbox } from '@renderer/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@renderer/components/ui/select'

interface TableDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  schema: string
  existingTable?: TableInfo
  onSubmit: (tableName: string, columns: ColumnDefinition[]) => void
  isPending?: boolean
}

const DATA_TYPES = [
  'INT',
  'BIGINT',
  'VARCHAR(255)',
  'TEXT',
  'BOOLEAN',
  'DECIMAL(10,2)',
  'DATE',
  'TIMESTAMP',
  'JSON'
]

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
      setColumns([
        { name: 'id', type: 'INT', nullable: false, isPrimaryKey: true, autoIncrement: true }
      ])
    }
  }, [mode, existingTable, open])

  const addColumn = () => {
    setColumns([
      ...columns,
      {
        name: `column_${columns.length + 1}`,
        type: 'VARCHAR(255)',
        nullable: true,
        isPrimaryKey: false
      }
    ])
  }

  const removeColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index))
  }

  const updateColumn = (index: number, field: keyof ColumnDefinition, value: unknown) => {
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

  const isValid = tableName.trim() !== '' && columns.length > 0 && columns.every((col) => col.name.trim() !== '')

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle>{mode === 'create' ? 'Create New Table' : 'Edit Table'}</SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            {mode === 'create'
              ? `Create a new table in the ${schema} schema`
              : `Modify the structure of table ${schema}.${existingTable?.name}`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 py-4">
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
              className="h-9"
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

            <div className="flex flex-col gap-3">
              {columns.map((column, index) => (
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
                        className="h-9"
                      />
                    </div>
                    <div className="flex-1">
                      <Select
                        value={column.type}
                        onValueChange={(value) => updateColumn(index, 'type', value)}
                        disabled={isPending}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          {DATA_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={() => removeColumn(index)}
                      variant="ghost"
                      size="icon"
                      disabled={columns.length === 1 || isPending}
                      className="h-9 w-9"
                    >
                      <Trash2Icon className="size-4" />
                      <span className="sr-only">Remove column</span>
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`nullable-${index}`}
                        checked={column.nullable !== false}
                        onCheckedChange={(checked) =>
                          updateColumn(index, 'nullable', checked === true)
                        }
                        disabled={isPending}
                      />
                      <Label
                        htmlFor={`nullable-${index}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        Nullable
                      </Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`primary-${index}`}
                        checked={column.isPrimaryKey === true}
                        onCheckedChange={(checked) =>
                          updateColumn(index, 'isPrimaryKey', checked === true)
                        }
                        disabled={isPending}
                      />
                      <Label
                        htmlFor={`primary-${index}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        Primary Key
                      </Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`unique-${index}`}
                        checked={column.isUnique === true}
                        onCheckedChange={(checked) => updateColumn(index, 'isUnique', checked === true)}
                        disabled={isPending}
                      />
                      <Label htmlFor={`unique-${index}`} className="text-sm font-normal cursor-pointer">
                        Unique
                      </Label>
                    </div>

                    {column.type.toUpperCase().includes('INT') && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`auto-${index}`}
                          checked={column.autoIncrement === true}
                          onCheckedChange={(checked) =>
                            updateColumn(index, 'autoIncrement', checked === true)
                          }
                          disabled={isPending}
                        />
                        <Label htmlFor={`auto-${index}`} className="text-sm font-normal cursor-pointer">
                          Auto Increment
                        </Label>
                      </div>
                    )}
                  </div>

                  <div>
                    <Input
                      value={column.defaultValue || ''}
                      onChange={(e) => updateColumn(index, 'defaultValue', e.target.value)}
                      placeholder="Default value (optional)"
                      disabled={isPending}
                      className="h-9"
                    />
                  </div>
                </div>
              ))}
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
