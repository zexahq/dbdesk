import type {
  QueryResultRow,
  SQLConnectionProfile,
  TableFilterCondition,
  TableSortRule
} from '@common/types'
import {
  useDeleteTableRows,
  useSchemasWithTables,
  useTableData,
  useUpdateTableCell
} from '@renderer/api/queries/schema'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from '@renderer/components/ui/resizable'
import { SidebarInset, SidebarProvider } from '@renderer/components/ui/sidebar'
import { cn } from '@renderer/lib/utils'
import { useDataTableStore } from '@renderer/store/data-table-store'
import { useSqlWorkspaceStore } from '@renderer/store/sql-workspace-store'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { UpdateErrorDialog } from './dialogs/update-error-dialog'
import { SqlBottombar } from './sql-bottombar'
import { DbSidebar } from './sql-sidebar'
import { SqlStructure } from './sql-structure'
import { SqlTopbar } from './sql-topbar'
import { SqlTable } from './table'

interface SqlWorkspaceProps {
  profile: SQLConnectionProfile
}

export function SqlWorkspace({ profile }: SqlWorkspaceProps) {
  const {
    selectedSchema,
    selectedTable,
    setSelectedSchema,
    setSelectedTable,
    setSchemasWithTables
  } = useSqlWorkspaceStore()
  const rowSelection = useDataTableStore((state) => state.rowSelection)
  const setRowSelection = useDataTableStore((state) => state.setRowSelection)

  const [view, setView] = useState<'tables' | 'structure'>('tables')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [limit, setLimit] = useState(50)
  const [offset, setOffset] = useState(0)
  const [filters, setFilters] = useState<TableFilterCondition[] | undefined>(undefined)
  const [sortRules, setSortRules] = useState<TableSortRule[] | undefined>(undefined)
  const [updateErrorDialogOpen, setUpdateErrorDialogOpen] = useState(false)
  const [updateError, setUpdateError] = useState<{ query?: string; error?: string }>({})

  // Fetch schemas with tables and sync to store
  const { data: schemasWithTables } = useSchemasWithTables(profile.id)
  useEffect(() => {
    if (schemasWithTables) {
      setSchemasWithTables(schemasWithTables)
    } else {
      setSchemasWithTables([])
    }
  }, [schemasWithTables, setSchemasWithTables])

  // Auto-select schema and table after data loads
  useEffect(() => {
    if (schemasWithTables && schemasWithTables.length > 0 && !selectedSchema) {
      // Find "public" schema or use first schema
      const publicSchema = schemasWithTables.find((s) => s.schema === 'public')
      const targetSchema = publicSchema || schemasWithTables[0]

      if (targetSchema) {
        setSelectedSchema(targetSchema.schema)
        // Select first table if available
        if (targetSchema.tables.length > 0) {
          setSelectedTable(targetSchema.tables[0])
        }
      }
    }
  }, [schemasWithTables, selectedSchema, setSelectedSchema, setSelectedTable])

  // Reset offset and filters when table changes
  useEffect(() => {
    setOffset(0)
    setFilters(undefined)
    setSortRules(undefined)
  }, [selectedTable])

  const queryClient = useQueryClient()

  const {
    data: tableData,
    isLoading: isLoadingTableData,
    error
  } = useTableData(profile.id, selectedSchema || undefined, selectedTable || undefined, {
    limit,
    offset,
    filters,
    sortRules
  })
  const { mutateAsync: deleteRowsMutation, isPending: isDeletePending } = useDeleteTableRows(
    profile.id
  )
  const { mutateAsync: updateCellMutation } = useUpdateTableCell(profile.id)

  const refreshTableData = () => {
    if (selectedSchema && selectedTable) {
      // Invalidate all table data queries for this connection, schema, and table
      queryClient.invalidateQueries({
        queryKey: ['table-data', profile.id, selectedSchema, selectedTable]
      })
    }
  }

  const refreshSchemasWithTables = () => {
    queryClient.invalidateQueries({
      queryKey: ['schemasWithTables', profile.id]
    })
  }

  useEffect(() => {
    setRowSelection({})
    useDataTableStore.getState().setColumnVisibility({})
  }, [selectedTable, setRowSelection])

  const selectedRows = useMemo<QueryResultRow[]>(() => {
    if (!tableData) {
      return []
    }
    return Object.entries(rowSelection)
      .filter(([, isSelected]) => Boolean(isSelected))
      .map(([rowId]) => tableData.rows[Number(rowId)])
      .filter((row): row is QueryResultRow => Boolean(row))
  }, [rowSelection, tableData])

  const handleCellUpdate = useCallback(
    async (columnToUpdate: string, newValue: unknown, row: QueryResultRow) => {
      if (!selectedSchema || !selectedTable || !tableData) {
        return
      }

      if (!tableData.primaryKeyColumns || tableData.primaryKeyColumns.length === 0) {
        toast.error('Please add a primary key column to update rows.')
        return
      }

      try {
        await updateCellMutation({
          schema: selectedSchema,
          table: selectedTable,
          columnToUpdate,
          newValue,
          row
        })
        toast.success('Cell updated successfully.')
        refreshTableData()
      } catch (error) {
        const err = error as Error & { query?: string }
        setUpdateError({
          query: err.query,
          error: err.message
        })
        setUpdateErrorDialogOpen(true)
      }
    },
    [selectedSchema, selectedTable, tableData, updateCellMutation, refreshTableData]
  )

  const handleDeleteSelectedRows = useCallback(async () => {
    if (!selectedSchema || !selectedTable || !tableData) {
      return
    }

    if (!tableData.primaryKeyColumns || tableData.primaryKeyColumns.length === 0) {
      toast.error('Please add a primary key column to delete rows.')
      return
    }

    if (selectedRows.length === 0) {
      toast.error('Select at least one row to delete.')
      return
    }

    try {
      const result = await deleteRowsMutation({
        schema: selectedSchema,
        table: selectedTable,
        rows: selectedRows
      })
      toast.success(
        `Deleted ${result.deletedRowCount} row${result.deletedRowCount === 1 ? '' : 's'}.`
      )
      setRowSelection({})
      refreshTableData()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete rows.'
      toast.error(message)
    }
  }, [
    deleteRowsMutation,
    refreshTableData,
    selectedRows,
    selectedSchema,
    selectedTable,
    setRowSelection,
    tableData
  ])

  return (
    <SidebarProvider className="h-full">
      <ResizablePanelGroup direction="horizontal" className="h-full overflow-hidden">
        <ResizablePanel
          defaultSize={16}
          minSize={12}
          maxSize={32}
          className={cn(!isSidebarOpen && 'hidden')}
        >
          <DbSidebar profile={profile} onRefresh={refreshSchemasWithTables} />
        </ResizablePanel>
        <ResizableHandle withHandle className={cn(!isSidebarOpen && 'hidden')} />
        <ResizablePanel>
          <SidebarInset className="flex h-full flex-col overflow-hidden">
            <SqlTopbar
              view={view}
              onViewChange={setView}
              isSidebarOpen={isSidebarOpen}
              onSidebarOpenChange={setIsSidebarOpen}
              onRefresh={refreshTableData}
              isLoading={isLoadingTableData}
              connectionId={profile.id}
              columns={tableData?.columns}
              filters={filters}
              onFiltersChange={setFilters}
              sortRules={sortRules}
              onSortRulesChange={setSortRules}
              onDeleteRows={handleDeleteSelectedRows}
              isDeletePending={isDeletePending}
            />
            <div className="flex-1 overflow-hidden">
              {view === 'tables' && (
                <SqlTable
                  isLoading={isLoadingTableData}
                  error={error}
                  tableData={tableData}
                  onCellUpdate={handleCellUpdate}
                />
              )}
              {view === 'structure' && (
                <SqlStructure
                  connectionId={profile.id}
                  schema={selectedSchema || ''}
                  table={selectedTable || ''}
                />
              )}
            </div>
            {tableData && (
              <SqlBottombar
                tableData={tableData}
                limit={limit}
                offset={offset}
                onLimitChange={setLimit}
                onOffsetChange={setOffset}
              />
            )}
          </SidebarInset>
        </ResizablePanel>
      </ResizablePanelGroup>
      <UpdateErrorDialog
        open={updateErrorDialogOpen}
        onOpenChange={setUpdateErrorDialogOpen}
        query={updateError.query}
        error={updateError.error}
      />
    </SidebarProvider>
  )
}
