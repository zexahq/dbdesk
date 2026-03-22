import { POSTGRES_DATA_TYPES } from '@dbdesk/shared/constants'
import type { ColumnDefinition, DatabaseType } from '@dbdesk/shared/types'
import { useCreateTable } from '@renderer/features/sql-workspace/queries/schema'
import { Button } from '@renderer/components/ui/button'
import { Checkbox } from '@renderer/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@renderer/components/ui/table'
import { Link, PlusIcon, Settings, Trash2Icon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { UpsertForeignKeySheet } from './upsert-foreign-key-sheet'
import { cn } from '@renderer/shared/lib/utils'

interface AddTableSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  connectionId: string
  schema: string
  databaseType: DatabaseType
}

export const AddTableSheet = ({
  open,
  onOpenChange,
  connectionId,
  schema
}: AddTableSheetProps) => {
  const [tableName, setTableName] = useState('')
  const [columns, setColumns] = useState<ColumnDefinition[]>([])
  const [editingForeignKey, setEditingForeignKey] = useState<number | null>(null)

  const createTableMutation = useCreateTable(connectionId)
  const isPending = createTableMutation.isPending

  const DATA_TYPES = POSTGRES_DATA_TYPES

  const addColumn = () => {
    setColumns([
      ...columns,
      {
        name: '',
        type: '',
        nullable: false,
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
    createTableMutation.mutate(
      { schema, table: tableName.trim(), columns },
      {
        onSuccess: () => {
          onOpenChange(false)
          setTableName('')
          setColumns([])
          setEditingForeignKey(null)
        }
      }
    )
  }

  const handleForeignKeySubmit = (foreignKey: ColumnDefinition['foreignKey']) => {
    if (editingForeignKey === null) return

    const newColumns = [...columns]
    newColumns[editingForeignKey].foreignKey = foreignKey
    setColumns(newColumns)
    setEditingForeignKey(null)
  }

  const clearForeignKey = (index: number) => {
    const newColumns = [...columns]
    newColumns[index] = { ...newColumns[index], foreignKey: undefined }
    setColumns(newColumns)
  }

  const isValid = useMemo(() => {
    return (
      tableName.trim() !== '' &&
      columns.length > 0 &&
      columns.every((column) => column.name.trim() !== '' && column.type.trim() !== '')
    )
  }, [tableName, columns])

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(open) => {
          onOpenChange(open)
          setTableName('')
          setColumns([])
          setEditingForeignKey(null)
        }}
      >
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
                <Table className="[&_tr]:border-b-0">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[min(12rem,30%)]">Name</TableHead>
                      <TableHead className="w-32">Type</TableHead>
                      <TableHead className="w-[min(12rem,30%)]">Default Value</TableHead>
                      <TableHead className="w-12">Primary</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {columns.map((column, index) => (
                      <TableRow key={index} className="border-b-0 hover:bg-transparent">
                        <TableCell className="p-2">
                          <div className="flex items-center gap-2 relative">
                            <Input
                              value={column.name}
                              onChange={(e) => updateColumn(index, 'name', e.target.value)}
                              placeholder="Column name"
                              disabled={isPending}
                              className="h-9 pr-8 border-border focus:border-white! focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:ring-offset-0"
                            />
                            <Link
                              className={cn(
                                'size-4 absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer shrink-0',
                                column.foreignKey
                                  ? 'text-green-400'
                                  : 'text-muted-foreground hover:text-primary'
                              )}
                              onClick={() => setEditingForeignKey(index)}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="p-2">
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
                            <SelectContent className="max-h-100">
                              {DATA_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-2">
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
                        </TableCell>
                        <TableCell className="p-2">
                          <label className="flex items-center cursor-pointer w-fit">
                            <Checkbox
                              checked={column.isPrimaryKey === true}
                              onCheckedChange={(checked) =>
                                updateColumn(index, 'isPrimaryKey', checked === true)
                              }
                              disabled={isPending}
                              aria-label="Primary key"
                              className="border-muted-foreground/60 bg-muted/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground"
                            />
                          </label>
                        </TableCell>
                        <TableCell className="p-2">
                          <div className="flex items-center gap-0">
                            {(() => {
                              const optionsChecked =
                                (column.nullable !== false ? 1 : 0) +
                                (column.isUnique === true ? 1 : 0)
                              return (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      disabled={isPending}
                                      className="relative h-9 w-9"
                                    >
                                      <Settings className="size-4" />
                                      {optionsChecked > 0 && (
                                        <span
                                          className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-black shadow-sm"
                                          aria-hidden
                                        >
                                          {optionsChecked}
                                        </span>
                                      )}
                                      <span className="sr-only">Column options</span>
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
                                      checked={column.isUnique === true}
                                      onCheckedChange={(checked) =>
                                        updateColumn(index, 'isUnique', checked === true)
                                      }
                                      disabled={isPending}
                                    >
                                      Unique
                                    </DropdownMenuCheckboxItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )
                            })()}
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
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* Foreign Keys summary */}
              {columns.some((c) => c.foreignKey) && (
                <div className="flex flex-col gap-3 pt-4 border-t">
                  <Label className="text-sm font-medium">Foreign Keys</Label>
                  <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-3">
                    {columns.map(
                      (column, index) =>
                        column.foreignKey && (
                          <div
                            key={index}
                            className="flex gap-1.5 rounded-md border border-border/60 bg-background/80 px-3 py-2.5 text-sm"
                          >
                            <div className="flex flex-col gap-3 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground text-sm">
                                  Foreign key relation to:
                                </span>
                                <span className="inline-flex items-center rounded-md border border-border bg-muted/50 px-2 py-0.5 font-medium text-foreground">
                                  {column.foreignKey.schema}.{column.foreignKey.table}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-muted-foreground text-sm">Columns:</span>
                                <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-2 py-0.5 text-muted-foreground">
                                  {column.name}
                                  <span className="text-muted-foreground/70">→</span>
                                  {column.foreignKey.schema}.{column.foreignKey.table}.
                                  {column.foreignKey.column}
                                </span>
                              </div>
                            </div>
                            <div className="mt-1 flex justify-end gap-1">
                              <Button
                                variant="secondary"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setEditingForeignKey(index)}
                                disabled={isPending}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => clearForeignKey(index)}
                                disabled={isPending}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        )
                    )}
                  </div>
                </div>
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
            <Button onClick={handleSubmit} disabled={isPending || !isValid} className="h-9">
              {isPending ? 'Saving...' : 'Create Table'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      {editingForeignKey !== null && (
        <UpsertForeignKeySheet
          onClose={() => setEditingForeignKey(null)}
          onSubmit={handleForeignKeySubmit}
          foreignKey={columns[editingForeignKey].foreignKey}
        />
      )}
    </>
  )
}
