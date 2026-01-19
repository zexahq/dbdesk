import { useExportTableAsCSV, useExportTableAsSQL } from '@renderer/api/queries/export'
import { useDeleteTable, useInsertTableRow, useTableIntrospection } from '@renderer/api/queries/schema'
import { AddRowDialog } from '@renderer/components/sql/drawers/add-row-drawer'
import { DeleteTableConfirmationDialog } from '@renderer/components/sql/dialogs/delete-table-confirmation-dialog'
import { Button } from '@renderer/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import { cn } from '@renderer/lib/utils'
import { useTabStore } from '@renderer/store/tab-store'
import { FileCode2, FileDown, MoreVertical, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

interface TableOptionsDropdownProps {
  connectionId: string
  schema: string
  table: string
  disabled?: boolean
}

export function TableOptionsDropdown({
  connectionId,
  schema,
  table,
  disabled
}: TableOptionsDropdownProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [addRowDialogOpen, setAddRowDialogOpen] = useState(false)
  const exportCSVMutation = useExportTableAsCSV(connectionId)
  const exportSQLMutation = useExportTableAsSQL(connectionId)
  const deleteTableMutation = useDeleteTable(connectionId)
  const insertRowMutation = useInsertTableRow(connectionId, schema, table)

  const { data: tableInfo } = useTableIntrospection(connectionId, schema, table)

  const removeTab = useTabStore((s) => s.removeTab)
  const findTableTabById = useTabStore((s) => s.findTableTabById)

  const handleDelete = () => {
    deleteTableMutation.mutate(
      { schema, table },
      {
        onSuccess: (result) => {
          if (result.success) {
            setDeleteDialogOpen(false)
            const tableTabId = `${schema}.${table}`
            const tab = findTableTabById(tableTabId)
            if (tab) {
              removeTab(tab.id)
            }
          }
        }
      }
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-8 w-8 cursor-pointer text-muted-foreground/60 hover:text-foreground hover:bg-accent active:text-foreground active:bg-accent'
            )}
            disabled={disabled}
          >
            <MoreVertical className="size-4" />
            <span className="sr-only">Table options</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side="bottom"
          className="w-52"
          sideOffset={4}
          avoidCollisions
        >
          <DropdownMenuItem
            className="cursor-pointer text-sm flex items-center gap-2"
            onSelect={() => {
              setAddRowDialogOpen(true)
            }}
          >
            <Plus className="size-4" />
            <span>Add row</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer text-sm flex items-center gap-2"
            onSelect={() => {
              exportCSVMutation.mutate({ schema, table })
            }}
          >
            <FileDown className="size-4" />
            <span>Export as CSV</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer text-sm flex items-center gap-2"
            onSelect={() => {
              exportSQLMutation.mutate({ schema, table })
            }}
          >
            <FileCode2 className="size-4" />
            <span>Export as SQL</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer text-sm flex items-center gap-2"
            onSelect={() => {
              setDeleteDialogOpen(true)
            }}
          >
            <Trash2 className="size-4" />
            <span>Delete table</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteTableConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        table={table}
        schema={schema}
        isPending={deleteTableMutation.isPending}
      />


      <AddRowDialog
        open={addRowDialogOpen}
        onOpenChange={setAddRowDialogOpen}
        columns={tableInfo?.columns ?? []}
        tableName={table}
        onSubmit={(values) => {
          insertRowMutation.mutate(values, {
            onSuccess: () => {
              setAddRowDialogOpen(false)
            }
          })
        }}
        isPending={insertRowMutation.isPending}
      />
    </>
  )
}
