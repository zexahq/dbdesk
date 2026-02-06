import { Sheet, SheetContent, SheetFooter, SheetTitle } from '@renderer/components/ui/sheet'
import { useSqlWorkspaceStore } from '@renderer/store/sql-workspace-store'
import { useTableColumns } from '@renderer/api/queries/schema'
import { useEffect, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { Label } from '@renderer/components/ui/label'
import { ColumnDefinition, ColumnInfo } from '@common/types'
import { Button } from '@renderer/components/ui/button'
import { Loader2 } from 'lucide-react'

type ForeignKeyAction = NonNullable<ColumnDefinition['foreignKey']>['onDelete']

interface UpsertForeignKeySheetProps {
  onClose: () => void
  onSubmit: (foreignKey: ColumnDefinition['foreignKey']) => void
  foreignKey: ColumnDefinition['foreignKey']
}

const UpsertForeignKeySheet = ({ onClose, onSubmit, foreignKey }: UpsertForeignKeySheetProps) => {
  const [schema, setSchema] = useState(foreignKey?.schema ?? '')
  const [table, setTable] = useState(foreignKey?.table ?? '')
  const [column, setColumn] = useState('')
  const [columns, setColumns] = useState<ColumnInfo[]>([])
  const [onDelete, setOnDelete] = useState<ForeignKeyAction>('CASCADE')
  const [onUpdate, setOnUpdate] = useState<ForeignKeyAction>('CASCADE')

  const schemasWithTables = useSqlWorkspaceStore((s) => s.schemasWithTables)
  const currentConnectionId = useSqlWorkspaceStore((s) => s.currentConnectionId)

  const getTableColumns = useTableColumns()

  useEffect(() => {
    if (!foreignKey) return

    getTableColumns.mutate(
      { connectionId: currentConnectionId ?? '', schema, table: foreignKey.table },
      {
        onSuccess: (data) => {
          setColumns(data)
          setColumn(foreignKey.column)
          setOnDelete(foreignKey.onDelete)
          setOnUpdate(foreignKey.onUpdate)
        }
      }
    )
  }, [])

  const handleSubmit = () => {
    onSubmit({ schema, table, column, onDelete, onUpdate })
  }

  return (
    <Sheet open={true} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg [&>button]:hidden gap-0">
        <SheetTitle>
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="text-lg font-semibold">Add Foreign Key</h2>
          </div>
        </SheetTitle>

        <div className="flex flex-col gap-3 px-6 pt-6">
          <Label htmlFor="schema" className="text-sm font-medium">
            Schema
          </Label>
          <Select
            value={schema}
            onValueChange={(value) => {
              setSchema(value)
              setTable('')
              setColumn('')
              setColumns([])
            }}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Select schema" />
            </SelectTrigger>
            <SelectContent className="max-h-100">
              {schemasWithTables.map((s) => (
                <SelectItem key={s.schema} value={s.schema}>
                  {s.schema}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Label htmlFor="table" className="text-sm font-medium">
            Table
          </Label>
          <Select
            value={table}
            onValueChange={(value) => {
              setTable(value)
              setColumns([])
              setColumn('')

              const connectionId = currentConnectionId ?? ''
              if (!connectionId || !schema) return

              console.log(value)

              getTableColumns.mutate(
                { connectionId, schema, table: value },
                { onSuccess: (data) => setColumns(data) }
              )
            }}
            disabled={!schema}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Select table" />
            </SelectTrigger>
            <SelectContent className="max-h-100">
              {schemasWithTables
                .find((s) => s.schema === schema)
                ?.tables.map((table) => (
                  <SelectItem key={table} value={table}>
                    {table}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {table && (
            <>
              {getTableColumns.isPending && (
                <div className="text-muted-foreground text-sm w-full flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                </div>
              )}
              {getTableColumns.isError && (
                <p className="text-destructive text-sm">Failed to load columns.</p>
              )}
              {columns.length > 0 && !getTableColumns.isPending && (
                <>
                  <Label htmlFor="column" className="text-sm font-medium">
                    Column
                  </Label>
                  <Select value={column} onValueChange={setColumn}>
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent className="max-h-100">
                      {columns.map((c) => (
                        <SelectItem key={c.name} value={c.name}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Label htmlFor="onDelete" className="text-sm font-medium">
                    On Delete
                  </Label>
                  <Select
                    value={onDelete}
                    onValueChange={(v) => setOnDelete(v as ForeignKeyAction)}
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="Select on delete" />
                    </SelectTrigger>
                    <SelectContent className="max-h-100">
                      <SelectItem value="CASCADE">CASCADE</SelectItem>
                      <SelectItem value="RESTRICT">RESTRICT</SelectItem>
                      <SelectItem value="SET NULL">SET NULL</SelectItem>
                      <SelectItem value="SET DEFAULT">SET DEFAULT</SelectItem>
                      <SelectItem value="NO ACTION">NO ACTION</SelectItem>
                    </SelectContent>
                  </Select>
                  <Label htmlFor="onUpdate" className="text-sm font-medium">
                    On Update
                  </Label>
                  <Select
                    value={onUpdate}
                    onValueChange={(v) => setOnUpdate(v as ForeignKeyAction)}
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="Select on update" />
                    </SelectTrigger>
                    <SelectContent className="max-h-100">
                      <SelectItem value="CASCADE">CASCADE</SelectItem>
                      <SelectItem value="RESTRICT">RESTRICT</SelectItem>
                      <SelectItem value="SET NULL">SET NULL</SelectItem>
                      <SelectItem value="SET DEFAULT">SET DEFAULT</SelectItem>
                      <SelectItem value="NO ACTION">NO ACTION</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}
            </>
          )}
        </div>
        <SheetFooter className="flex flex-row items-center justify-end gap-2 border-t p-4">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={!schema || !table || !column || !onDelete || !onUpdate}
          >
            Submit
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export { UpsertForeignKeySheet }
