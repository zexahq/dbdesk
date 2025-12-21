import type { QueryResultRow, SQLConnectionProfile } from '@common/types'
import { useRunQuery } from '@renderer/api/queries/query'
import {
  useDeleteTableRows,
  useSchemasWithTables,
  useTableData,
  useUpdateTableCell
} from '@renderer/api/queries/schema'
import { SaveQueryDialog } from '@renderer/components/dialogs/save-query-dialog'
import SqlEditor from '@renderer/components/editor/sql-editor'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from '@renderer/components/ui/resizable'
import { SidebarInset, SidebarProvider } from '@renderer/components/ui/sidebar'
import { cn } from '@renderer/lib/utils'
import { useQueryTabStore } from '@renderer/store/query-tab-store'
import { useSavedQueriesStore } from '@renderer/store/saved-queries-store'
import { useSqlWorkspaceStore } from '@renderer/store/sql-workspace-store'
import { useTabStore } from '@renderer/store/tab-store'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { UpdateErrorDialog } from './dialogs/update-error-dialog'
import { QueryResults } from './query-view/query-results'
import { SqlTable } from './table'
import { SqlBottombar } from './table-view/sql-bottombar'
import { SqlStructure } from './table-view/sql-structure'
import { SqlTopbar } from './table-view/sql-topbar'
import { TabNavigation } from './table-view/tab-navigation'
import { WorkspaceSidebar } from './workspace-sidebar'
import { WorkspaceTopbar } from './workspace-topbar'

export function SqlWorkspace({ profile }: { profile: SQLConnectionProfile }) {
  const { view, setSchemasWithTables } = useSqlWorkspaceStore()
  const { getActiveTab: getActiveTableTab, updateTabState } = useTabStore()
  const activeTableTab = getActiveTableTab()

  const {
    tabs: queryTabs,
    getActiveTab: getActiveQueryTab,
    updateTab: updateQueryTab
  } = useQueryTabStore()

  const activeQueryTab = getActiveQueryTab()

  const { queries, saveQuery, updateQuery } = useSavedQueriesStore()

  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [updateErrorDialogOpen, setUpdateErrorDialogOpen] = useState(false)
  const [updateError, setUpdateError] = useState<{ query?: string; error?: string }>({})
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionError, setExecutionError] = useState<Error | null>(null)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)

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

  // Table data fetching
  const {
    data: tableData,
    isLoading: isLoadingTableData,
    error: tableError
  } = useTableData(
    profile.id,
    activeTableTab?.schema,
    activeTableTab?.table,
    activeTableTab
      ? {
          limit: activeTableTab.limit,
          offset: activeTableTab.offset,
          filters: activeTableTab.filters,
          sortRules: activeTableTab.sortRules
        }
      : undefined
  )

  const { mutateAsync: deleteRowsMutation, isPending: isDeletePending } = useDeleteTableRows(
    profile.id
  )
  const { mutateAsync: updateCellMutation } = useUpdateTableCell(profile.id)
  const { mutateAsync: runQuery } = useRunQuery(profile.id)

  // Check if active query tab is saved
  const isQueryTabSaved = activeQueryTab ? queries.some((q) => q.id === activeQueryTab.id) : false

  // Handle Ctrl+S to save query
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (view !== 'query' || !activeQueryTab || !activeQueryTab.editorContent.trim()) {
          if (view === 'query') toast.error('Query cannot be empty')
          return
        }

        if (isQueryTabSaved) {
          void handleUpdateQuery()
        } else {
          setSaveDialogOpen(true)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeQueryTab, isQueryTabSaved, view])

  const refreshTableData = () => {
    if (activeTableTab) {
      queryClient.invalidateQueries({
        queryKey: ['table-data', profile.id, activeTableTab.schema, activeTableTab.table]
      })
    }
  }

  const selectedRows = useMemo<QueryResultRow[]>(() => {
    if (!tableData || !activeTableTab) {
      return []
    }
    return Object.entries(activeTableTab.rowSelection)
      .filter(([, isSelected]) => Boolean(isSelected))
      .map(([rowId]) => tableData.rows[Number(rowId)])
      .filter((row): row is QueryResultRow => Boolean(row))
  }, [activeTableTab, tableData])

  const handleCellUpdate = useCallback(
    async (columnToUpdate: string, newValue: unknown, row: QueryResultRow) => {
      if (!activeTableTab || !tableData) {
        return
      }

      if (!tableData.primaryKeyColumns || tableData.primaryKeyColumns.length === 0) {
        toast.error('Please add a primary key column to update rows.')
        return
      }

      try {
        await updateCellMutation({
          schema: activeTableTab.schema,
          table: activeTableTab.table,
          columnToUpdate,
          newValue,
          row
        })
        toast.success('Cell updated successfully.')
        refreshTableData()
      } catch (error) {
        const err = error as Error & { query?: string }

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
    [activeTableTab, tableData, updateCellMutation]
  )

  const handleDeleteSelectedRows = useCallback(async () => {
    if (!activeTableTab || !tableData) {
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
        schema: activeTableTab.schema,
        table: activeTableTab.table,
        rows: selectedRows
      })
      toast.success(
        `Deleted ${result.deletedRowCount} row${result.deletedRowCount === 1 ? '' : 's'}.`
      )
      updateTabState(activeTableTab.id, { rowSelection: {} })
      refreshTableData()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete rows.'
      toast.error(message)
    }
  }, [deleteRowsMutation, selectedRows, activeTableTab, tableData, updateTabState])

  const handleLimitChange = useCallback(
    (limit: number) => {
      if (activeTableTab) {
        updateTabState(activeTableTab.id, { limit, offset: 0 })
      }
    },
    [activeTableTab, updateTabState]
  )

  const handleOffsetChange = useCallback(
    (offset: number) => {
      if (activeTableTab) {
        updateTabState(activeTableTab.id, { offset })
      }
    },
    [activeTableTab, updateTabState]
  )

  // Query execution
  const handleRunQuery = async () => {
    if (!activeQueryTab) {
      toast.error('No active tab')
      return
    }

    const query = activeQueryTab.editorContent.trim()
    if (!query) {
      toast.error('Query cannot be empty')
      return
    }

    setIsExecuting(true)
    setExecutionError(null)

    try {
      const data = await runQuery(query)
      updateQueryTab(activeQueryTab.id, { queryResults: data })
      toast.success('Query executed successfully')
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to execute query')
      setExecutionError(err)
      updateQueryTab(activeQueryTab.id, { queryResults: undefined })
      toast.error(err.message)
    } finally {
      setIsExecuting(false)
    }
  }

  const handleUpdateQuery = async () => {
    if (!activeQueryTab) return

    const savedQuery = queries.find((q) => q.id === activeQueryTab.id)
    if (!savedQuery) return

    try {
      await updateQuery(
        profile.id,
        activeQueryTab.id,
        savedQuery.name,
        activeQueryTab.editorContent
      )
      updateQueryTab(activeQueryTab.id, { lastSavedContent: activeQueryTab.editorContent })
      toast.success('Query saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save query')
    }
  }

  const handleSaveQuery = async (name: string) => {
    if (!activeQueryTab) {
      toast.error('No active tab')
      return
    }

    try {
      await saveQuery(profile.id, activeQueryTab.id, name, activeQueryTab.editorContent)
      updateQueryTab(activeQueryTab.id, { name, lastSavedContent: activeQueryTab.editorContent })
      toast.success('Query saved successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save query')
    }
  }

  return (
    <>
      <SidebarProvider className="h-full">
        <TabNavigation />
        <ResizablePanelGroup direction="horizontal" className="h-full overflow-hidden">
          <ResizablePanel
            defaultSize={16}
            minSize={12}
            maxSize={32}
            className={cn(!isSidebarOpen && 'hidden')}
          >
            <WorkspaceSidebar profile={profile} />
          </ResizablePanel>
          <ResizableHandle withHandle className={cn(!isSidebarOpen && 'hidden')} />
          <ResizablePanel>
            <SidebarInset className="flex h-full flex-col overflow-hidden">
              <WorkspaceTopbar
                profile={profile}
                isSidebarOpen={isSidebarOpen}
                onSidebarOpenChange={setIsSidebarOpen}
              />

              {/* Table View Content */}
              {view === 'table' && (
                <>
                  {activeTableTab ? (
                    <>
                      <SqlTopbar
                        tabId={activeTableTab.id}
                        onRefresh={refreshTableData}
                        isLoading={isLoadingTableData}
                        columns={tableData?.columns}
                        onDeleteRows={handleDeleteSelectedRows}
                        isDeletePending={isDeletePending}
                      />
                      <div className="flex-1 overflow-hidden">
                        {activeTableTab.view === 'tables' && (
                          <SqlTable
                            tabId={activeTableTab.id}
                            isLoading={isLoadingTableData}
                            error={tableError}
                            tableData={tableData}
                            onCellUpdate={handleCellUpdate}
                          />
                        )}
                        {activeTableTab.view === 'structure' && (
                          <SqlStructure
                            connectionId={profile.id}
                            schema={activeTableTab.schema}
                            table={activeTableTab.table}
                          />
                        )}
                      </div>
                      {tableData && (
                        <SqlBottombar
                          tableData={tableData}
                          limit={activeTableTab.limit}
                          offset={activeTableTab.offset}
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
                </>
              )}

              {/* Query View Content */}
              {view === 'query' && (
                <>
                  {queryTabs.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
                      <div>
                        <p className="text-lg font-medium">No Query Open</p>
                        <p className="text-sm">
                          Create a new query or open a saved one from the sidebar
                        </p>
                      </div>
                    </div>
                  ) : (
                    <ResizablePanelGroup direction="vertical" className="flex-1">
                      <ResizablePanel defaultSize={50} minSize={30}>
                        <div className="h-full w-full">
                          {activeQueryTab && (
                            <SqlEditor
                              tabId={activeQueryTab.id}
                              value={activeQueryTab.editorContent}
                              onChange={(value) =>
                                updateQueryTab(activeQueryTab.id, { editorContent: value })
                              }
                              language={profile.type}
                              onExecute={handleRunQuery}
                            />
                          )}
                        </div>
                      </ResizablePanel>
                      <ResizableHandle />
                      <ResizablePanel defaultSize={50} minSize={30}>
                        <QueryResults
                          queryResults={activeQueryTab?.queryResults}
                          isLoading={isExecuting}
                          error={executionError}
                          onRun={handleRunQuery}
                        />
                      </ResizablePanel>
                    </ResizablePanelGroup>
                  )}
                </>
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

      <SaveQueryDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        onSave={handleSaveQuery}
      />
    </>
  )
}
