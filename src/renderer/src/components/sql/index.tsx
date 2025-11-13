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
import { SqlTable } from './sql-table'
import { SqlStructure } from './sql-structure'
import { cn } from '@renderer/lib/utils'

interface SqlWorkspaceProps {
  profile: SQLConnectionProfile
}

export function SqlWorkspace({ profile }: SqlWorkspaceProps) {
  const [selectedSchema, setSelectedSchema] = useState<string | null>(null)
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [view, setView] = useState<'tables' | 'structure'>('tables')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

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
          <SidebarInset className="h-full overflow-auto">
            <SqlTopbar
              view={view}
              onViewChange={setView}
              isSidebarOpen={isSidebarOpen}
              onSidebarOpenChange={setIsSidebarOpen}
            />
            {view === 'tables' && (
              <SqlTable
                connectionId={profile.id}
                schema={selectedSchema || ''}
                table={selectedTable || ''}
              />
            )}
            {view === 'structure' && (
              <SqlStructure
                connectionId={profile.id}
                schema={selectedSchema || ''}
                table={selectedTable || ''}
              />
            )}
          </SidebarInset>
        </ResizablePanel>
      </ResizablePanelGroup>
    </SidebarProvider>
  )
}
