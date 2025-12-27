'use client'

import { POSTGRES_DATA_TYPES } from '@common/constants/postgres'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Checkbox } from '@renderer/components/ui/checkbox'
import { Input } from '@renderer/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@renderer/components/ui/sheet'
import { useSqlWorkspaceStore } from '@renderer/store/sql-workspace-store'

interface Column {
  id: string
  name: string
  type: string
  isPrimaryKey: boolean
  defaultValue: string
}

export function AddTableSheet() {
  const [open, setOpen] = useState(false)
  const [tableName, setTableName] = useState('')
  const [selectedSchema, setSelectedSchema] = useState<string>('')
  const [columns, setColumns] = useState<Column[]>([])

  const { schemasWithTables } = useSqlWorkspaceStore()

  // Set default schema on first open
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (newOpen && !selectedSchema && schemasWithTables.length > 0) {
      setSelectedSchema(schemasWithTables[0].schema)
    }
  }

  const addColumn = () => {
    const newColumn: Column = {
      id: `col-${Date.now()}`,
      name: '',
      type: 'integer',
      isPrimaryKey: false,
      defaultValue: ''
    }
    setColumns([...columns, newColumn])
  }

  const updateColumn = (id: string, updates: Partial<Column>) => {
    setColumns(columns.map((col) => (col.id === id ? { ...col, ...updates } : col)))
  }

  const removeColumn = (id: string) => {
    setColumns(columns.filter((col) => col.id !== id))
  }

  const handleSave = () => {
    // TODO: Implement add table logic
    console.log({ tableName, selectedSchema, columns })
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="flex-1 justify-start h-10 gap-2 cursor-pointer"
        >
          <Plus className="size-4 text-muted-foreground" />
          New Table
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0 overflow-y-auto">
        <div className="flex flex-col h-full">
          <SheetTitle>
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold">Add New Table</h2>
            </div>
          </SheetTitle>

          <div className="flex-1 min-h-0 overflow-y-auto p-6 flex flex-col gap-6">
            {/* Schema and Table name in same row */}
            <div className="grid grid-cols-2 gap-4">
              <div className='flex flex-col gap-2'>
                <label className="text-sm font-medium text-foreground mb-2 block">Schema</label>
                <Select value={selectedSchema} onValueChange={setSelectedSchema}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a schema" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {schemasWithTables.map((schema) => (
                      <SelectItem key={schema.schema} value={schema.schema}>
                        {schema.schema}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='flex flex-col gap-2'>
                <label className="text-sm font-medium text-foreground mb-2 block">Table Name</label>
                <Input
                  placeholder="my_table"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                />
              </div>
            </div>

            {/* Columns section */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Columns</label>
              </div>

              {columns.length > 0 && (
                <div className="border rounded-md overflow-hidden">
                  {/* Header */}
                  <div className="grid grid-cols-[1fr_1fr_1fr_60px_32px] gap-3 p-3 bg-muted text-xs font-medium text-muted-foreground border-b">
                    <div>Name</div>
                    <div>Type</div>
                    <div>Default Value</div>
                    <div className="text-center">Primary</div>
                    <div></div>
                  </div>

                  {/* Rows */}
                  {columns.map((col) => (
                    <div
                      key={col.id}
                      className="grid grid-cols-[1fr_1fr_1fr_60px_32px] gap-3 p-3 border-b last:border-b-0 hover:bg-muted/30 transition-colors items-center"
                    >
                      <Input
                        placeholder="column_name"
                        value={col.name}
                        onChange={(e) => updateColumn(col.id, { name: e.target.value })}
                        className="h-8 w-full"
                      />
                      <Select value={col.type} onValueChange={(type) => updateColumn(col.id, { type })}>
                        <SelectTrigger size='sm' className="h-8 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {POSTGRES_DATA_TYPES.map((dt) => (
                            <SelectItem key={dt.value} value={dt.value}>
                              {dt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="NULL"
                        value={col.defaultValue}
                        onChange={(e) => updateColumn(col.id, { defaultValue: e.target.value })}
                        className="h-8 w-full"
                      />
                      <div className="flex justify-center">
                        <Checkbox
                          checked={col.isPrimaryKey}
                          onCheckedChange={(checked) =>
                            updateColumn(col.id, { isPrimaryKey: checked === true })
                          }
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 cursor-pointer"
                        onClick={() => removeColumn(col.id)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {columns.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-8 border rounded-md border-dashed">
                  No columns added yet
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={addColumn}
                className="gap-2 w-full"
              >
                <Plus className="size-4" />
                Add Column
              </Button>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2 border-t p-4 bg-muted/50">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="gap-2">
              <span>Cancel</span>
            </Button>
            <Button variant="default" size="sm" onClick={handleSave} className="gap-2">
              <span>Create Table</span>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
