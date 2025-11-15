import { useState, useEffect } from 'react'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from '@renderer/components/ui/resizable'
import { DbSidebar } from './sql-sidebar'
import { SidebarInset, SidebarProvider } from '@renderer/components/ui/sidebar'
import type { SQLConnectionProfile } from '@common/types'
import { SqlTopbar } from './sql-topbar'
import { SqlBottombar } from './sql-bottombar'
import { SqlTable } from './table'
import { SqlStructure } from './sql-structure'
import { cn } from '@renderer/lib/utils'
import { useTableData, useSchemasWithTables } from '@renderer/api/queries/schema'
import { useQueryClient } from '@tanstack/react-query'
import { useSqlWorkspaceStore } from '@renderer/store/sql-workspace-store'

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

  const [view, setView] = useState<'tables' | 'structure'>('tables')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [limit, setLimit] = useState(50)
  const [offset, setOffset] = useState(0)
  const [selectedRowsCount, setSelectedRowsCount] = useState(0)

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

  // Reset offset when table changes
  useEffect(() => {
    setOffset(0)
  }, [selectedTable])

  const queryClient = useQueryClient()

  const {
    data: tableData,
    isLoading: isLoadingTableData,
    error
  } = useTableData(profile.id, selectedSchema || undefined, selectedTable || undefined, {
    limit,
    offset
  })

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
              selectedRowsCount={selectedRowsCount}
            />
            <div className="flex-1 overflow-hidden">
              {view === 'tables' && (
                <SqlTable
                  isLoading={isLoadingTableData}
                  error={error}
                  tableData={tableData}
                  onSelectedRowsCountChange={setSelectedRowsCount}
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
    </SidebarProvider>
  )
}
