import type { QueryResultRow, SQLConnectionProfile } from '@common/types'
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
import { useSqlWorkspaceStore } from '@renderer/store/sql-workspace-store'
import { useTabStore } from '@renderer/store/tab-store'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { UpdateErrorDialog } from './dialogs/update-error-dialog'
import { MainTopbar } from './main-topbar'
import { SqlBottombar } from './sql-bottombar'
import { DbSidebar } from './sql-sidebar'
import { SqlStructure } from './sql-structure'
import { SqlTopbar } from './sql-topbar'
import { TabNavigation } from './tab-navigation'
import { SqlTable } from './table'

interface SqlWorkspaceProps {
  profile: SQLConnectionProfile
}

export function SqlWorkspace({ profile }: SqlWorkspaceProps) {
  const { setSchemasWithTables } = useSqlWorkspaceStore()
  const { getActiveTab, updateTabState } = useTabStore()
  const activeTab = getActiveTab()

  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
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

  const queryClient = useQueryClient()

  const {
    data: tableData,
    isLoading: isLoadingTableData,
    error
  } = useTableData(
    profile.id,
    activeTab?.schema,
    activeTab?.table,
    activeTab
      ? {
          limit: activeTab.limit,
          offset: activeTab.offset,
          filters: activeTab.filters,
          sortRules: activeTab.sortRules
        }
      : undefined
  )

  const { mutateAsync: deleteRowsMutation, isPending: isDeletePending } = useDeleteTableRows(
    profile.id
  )
  const { mutateAsync: updateCellMutation } = useUpdateTableCell(profile.id)

  const refreshTableData = () => {
    if (activeTab) {
      // Invalidate all table data queries for this connection, schema, and table
      queryClient.invalidateQueries({
        queryKey: ['table-data', profile.id, activeTab.schema, activeTab.table]
      })
    }
  }

  const refreshSchemasWithTables = () => {
    queryClient.invalidateQueries({
      queryKey: ['schemasWithTables', profile.id]
    })
  }

  const selectedRows = useMemo<QueryResultRow[]>(() => {
    if (!tableData || !activeTab) {
      return []
    }
    return Object.entries(activeTab.rowSelection)
      .filter(([, isSelected]) => Boolean(isSelected))
      .map(([rowId]) => tableData.rows[Number(rowId)])
      .filter((row): row is QueryResultRow => Boolean(row))
  }, [activeTab, tableData])

  const handleCellUpdate = useCallback(
    async (columnToUpdate: string, newValue: unknown, row: QueryResultRow) => {
      if (!activeTab || !tableData) {
        return
      }

      if (!tableData.primaryKeyColumns || tableData.primaryKeyColumns.length === 0) {
        toast.error('Please add a primary key column to update rows.')
        return
      }

      try {
        await updateCellMutation({
          schema: activeTab.schema,
          table: activeTab.table,
          columnToUpdate,
          newValue,
          row
        })
        toast.success('Cell updated successfully.')
        refreshTableData()
      } catch (error) {
        const err = error as Error & { query?: string }

        // Strip "Error invoking remote method 'xxx':" prefix from error message
        const cleanErrorMessage = (message: string): string => {
          const match = message.match(/^Error invoking remote method '[^']+': (.+)$/)
          return match ? match[1] : message
        }

        setUpdateError({
          query: err.query,
          error: cleanErrorMessage(err.message)
        })
        setUpdateErrorDialogOpen(true)
      }
    },
    [activeTab, tableData, updateCellMutation, refreshTableData]
  )

  const handleDeleteSelectedRows = useCallback(async () => {
    if (!activeTab || !tableData) {
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
        schema: activeTab.schema,
        table: activeTab.table,
        rows: selectedRows
      })
      toast.success(
        `Deleted ${result.deletedRowCount} row${result.deletedRowCount === 1 ? '' : 's'}.`
      )
      // Clear row selection for this tab
      updateTabState(activeTab.id, { rowSelection: {} })
      refreshTableData()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete rows.'
      toast.error(message)
    }
  }, [deleteRowsMutation, refreshTableData, selectedRows, activeTab, tableData, updateTabState])

  const handleLimitChange = useCallback(
    (limit: number) => {
      if (activeTab) {
        updateTabState(activeTab.id, { limit, offset: 0 })
      }
    },
    [activeTab, updateTabState]
  )

  const handleOffsetChange = useCallback(
    (offset: number) => {
      if (activeTab) {
        updateTabState(activeTab.id, { offset })
      }
    },
    [activeTab, updateTabState]
  )

  return (
    <SidebarProvider className="h-full">
      <TabNavigation />
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
            <MainTopbar
              profile={profile}
              isSidebarOpen={isSidebarOpen}
              onSidebarOpenChange={setIsSidebarOpen}
            />
            {activeTab ? (
              <>
                <SqlTopbar
                  tabId={activeTab.id}
                  onRefresh={refreshTableData}
                  isLoading={isLoadingTableData}
                  columns={tableData?.columns}
                  onDeleteRows={handleDeleteSelectedRows}
                  isDeletePending={isDeletePending}
                />
                <div className="flex-1 overflow-hidden">
                  {activeTab.view === 'tables' && (
                    <SqlTable
                      tabId={activeTab.id}
                      isLoading={isLoadingTableData}
                      error={error}
                      tableData={tableData}
                      onCellUpdate={handleCellUpdate}
                    />
                  )}
                  {activeTab.view === 'structure' && (
                    <SqlStructure
                      connectionId={profile.id}
                      schema={activeTab.schema}
                      table={activeTab.table}
                    />
                  )}
                </div>
                {tableData && (
                  <SqlBottombar
                    tableData={tableData}
                    limit={activeTab.limit}
                    offset={activeTab.offset}
                    onLimitChange={handleLimitChange}
                    onOffsetChange={handleOffsetChange}
                  />
                )}
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <p className="text-lg font-medium">No table selected</p>
                  <p className="text-sm">Select a table from the sidebar to get started</p>
                </div>
              </div>
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
