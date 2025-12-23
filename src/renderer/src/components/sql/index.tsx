import type { SQLConnectionProfile } from '@common/types'
import { useSchemasWithTables } from '@renderer/api/queries/schema'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from '@renderer/components/ui/resizable'
import { SidebarInset, SidebarProvider } from '@renderer/components/ui/sidebar'
import { cn } from '@renderer/lib/utils'
import { useSqlWorkspaceStore } from '@renderer/store/sql-workspace-store'
import { useTabStore } from '@renderer/store/tab-store'
import { useEffect, useState } from 'react'
import { QueryView } from './query-view'
import { TableView } from './table-view'
import { TabNavigation } from './table-view/tab-navigation'
import { WorkspaceSidebar } from './workspace-sidebar'
import { WorkspaceTopbar } from './workspace-topbar'

export function SqlWorkspace({ profile }: { profile: SQLConnectionProfile }) {
  const { setSchemasWithTables } = useSqlWorkspaceStore()
  const { getActiveTab } = useTabStore()

  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const activeTab = getActiveTab()

  const { data: schemasWithTables } = useSchemasWithTables(profile.id)

  useEffect(() => {
    if (schemasWithTables) {
      setSchemasWithTables(schemasWithTables)
    } else {
      setSchemasWithTables([])
    }
  }, [schemasWithTables, setSchemasWithTables])

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

              {/* No tab open - empty state */}
              {!activeTab ? (
                <div className="flex flex-1 items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <p className="text-lg font-medium">No tab open</p>
                    <p className="text-sm">Select a table from the sidebar or create a new query</p>
                  </div>
                </div>
              ) : activeTab?.kind === 'table' ? (
                <TableView profile={profile} activeTab={activeTab} />
              ) : activeTab?.kind === 'query' ? (
                <QueryView profile={profile} activeTab={activeTab} />
              ) : null}
            </SidebarInset>
          </ResizablePanel>
        </ResizablePanelGroup>
      </SidebarProvider>
    </>
  )
}
