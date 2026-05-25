import type { SQLConnectionProfile } from '@dbdesk/shared/types'
import { useSchemasWithTables } from '@renderer/features/sql-workspace/queries/schema'
import { UnsavedChangesDialog } from '@renderer/features/sql-workspace/components/dialogs/unsaved-changes-dialog'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from '@renderer/components/ui/resizable'
import { SidebarInset, SidebarProvider } from '@renderer/components/ui/sidebar'
import { cn } from '@renderer/shared/lib/utils'
import { useTabCloseHandler } from '@renderer/features/sql-workspace/hooks/use-tab-close-handler'
import { useSqlWorkspaceStore } from '@renderer/features/sql-workspace/stores/sql-workspace-store'
import { useTabStore } from '@renderer/features/sql-workspace/stores/tab-store'
import {
  useDashboardStore
} from '@renderer/features/sql-workspace/stores/dashboard-store'
import { dbdeskClient } from '@renderer/shared/api/client'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { QueryView } from './query-view'
import { TableView } from './table-view'
import { TabNavigation } from './table-view/tab-navigation'
import { WorkspaceSidebar } from './workspace-sidebar'
import { WorkspaceTopbar } from './workspace-topbar'
import { DashboardCanvas } from '@renderer/components/dashboard'

export function SqlWorkspace({ profile }: { profile: SQLConnectionProfile }) {
  const setSchemasWithTables = useSqlWorkspaceStore((s) => s.setSchemasWithTables)
  const setCurrentConnection = useSqlWorkspaceStore((s) => s.setCurrentConnection)
  const activeTab = useTabStore((state) => {
    const { tabs, activeTabId } = state
    return tabs.find((t) => t.id === activeTabId)
  })

  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const { requestCloseTab, dialogProps } = useTabCloseHandler(profile)

  const { data: schemasWithTables } = useSchemasWithTables(profile.id)

  const activeDashboardId = activeTab?.kind === 'dashboard' ? activeTab.dashboardId : null
  const { data: dashboardConfig } = useQuery({
    queryKey: ['dashboard', 'tab', profile.id, activeDashboardId],
    queryFn: () => dbdeskClient.getDashboard(profile.id, activeDashboardId!),
    enabled: !!activeDashboardId
  })

  // Set current connection ID for sidebar dashboard button
  useEffect(() => {
    setCurrentConnection(profile.id)
  }, [profile.id, setCurrentConnection])

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
        <TabNavigation profile={profile} requestCloseTab={requestCloseTab} />
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
                 requestCloseTab={requestCloseTab}
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
              ) : activeTab?.kind === 'dashboard' ? (
                dashboardConfig ? (
                  <DashboardCanvas
                    dashboard={dashboardConfig}
                    connectionId={profile.id}
                    onSave={async (config) => {
                      await useDashboardStore.getState().saveDashboard(config)
                    }}
                    onClose={() => {
                      useTabStore.getState().removeTab(activeTab.id)
                      useDashboardStore.getState().setCurrentDashboard(null)
                    }}
                  />
                ) : (
                  <div className="flex flex-1 items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <p className="text-lg font-medium">Loading dashboard...</p>
                    </div>
                  </div>
                )
              ) : null}
            </SidebarInset>
          </ResizablePanel>
        </ResizablePanelGroup>
      </SidebarProvider>
      <UnsavedChangesDialog {...dialogProps} />
    </>
  )
}
