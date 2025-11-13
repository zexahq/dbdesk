import { useState } from 'react'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from '@renderer/components/ui/resizable'
import { DbSidebar } from './sql-sidebar'
import { SidebarInset, SidebarProvider } from '@renderer/components/ui/sidebar'
import type { SQLConnectionProfile } from '@common/types'
import { SqlTopbar } from './sql-topbar'
import { SqlTable } from './table'
import { SqlStructure } from './sql-structure'
import { cn } from '@renderer/lib/utils'
import { useTableData } from '@renderer/api/queries/schema'

interface SqlWorkspaceProps {
  profile: SQLConnectionProfile
}

export function SqlWorkspace({ profile }: SqlWorkspaceProps) {
  const [selectedSchema, setSelectedSchema] = useState<string | null>(null)
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [view, setView] = useState<'tables' | 'structure'>('tables')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const {
    data: tableData,
    isLoading: isLoadingTableData,
    error
  } = useTableData(profile.id, selectedSchema || undefined, selectedTable || undefined)

  return (
    <SidebarProvider className="h-full">
      <ResizablePanelGroup direction="horizontal" className="h-full overflow-hidden">
        <ResizablePanel
          defaultSize={24}
          minSize={12}
          maxSize={32}
          className={cn(!isSidebarOpen && 'hidden')}
        >
          <DbSidebar
            profile={profile}
            selectedSchema={selectedSchema}
            selectedTable={selectedTable}
            onSchemaSelect={setSelectedSchema}
            onTableSelect={setSelectedTable}
          />
        </ResizablePanel>
        <ResizableHandle withHandle className={cn(!isSidebarOpen && 'hidden')} />
        <ResizablePanel>
          <SidebarInset className="flex h-full flex-col overflow-hidden">
            <SqlTopbar
              view={view}
              onViewChange={setView}
              isSidebarOpen={isSidebarOpen}
              onSidebarOpenChange={setIsSidebarOpen}
              tableData={tableData}
            />
            <div className="flex-1 overflow-hidden">
              {view === 'tables' && (
                <SqlTable isLoading={isLoadingTableData} error={error} tableData={tableData} />
              )}
              {view === 'structure' && (
                <SqlStructure
                  connectionId={profile.id}
                  schema={selectedSchema || ''}
                  table={selectedTable || ''}
                />
              )}
            </div>
          </SidebarInset>
        </ResizablePanel>
      </ResizablePanelGroup>
    </SidebarProvider>
  )
}
