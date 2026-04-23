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
import { dbdeskClient } from '@renderer/shared/api/client'
import { useEffect, useRef, useState } from 'react'
import { QueryView } from './query-view'
import { TableView } from './table-view'
import { TabNavigation } from './table-view/tab-navigation'
import { WorkspaceSidebar } from './workspace-sidebar'
import { WorkspaceTopbar } from './workspace-topbar'

export function SqlWorkspace({ profile }: { profile: SQLConnectionProfile }) {
  const setSchemasWithTables = useSqlWorkspaceStore((s) => s.setSchemasWithTables)
  const setTableColumns = useSqlWorkspaceStore((s) => s.setTableColumns)
  const activeTab = useTabStore((state) => {
    const { tabs, activeTabId } = state
    return tabs.find((t) => t.id === activeTabId)
  })

  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const { requestCloseTab, dialogProps } = useTabCloseHandler(profile)
  const columnsFetchedRef = useRef(false)

  const { data: schemasWithTables } = useSchemasWithTables(profile.id)

  useEffect(() => {
    if (schemasWithTables) {
      setSchemasWithTables(schemasWithTables)
    } else {
      setSchemasWithTables([])
    }
  }, [schemasWithTables, setSchemasWithTables])

  // Eager column fetching for autocompletion
  useEffect(() => {
    if (!schemasWithTables || columnsFetchedRef.current) return
    columnsFetchedRef.current = true

    for (const { schema, tables } of schemasWithTables) {
      for (const table of tables) {
        dbdeskClient
          .introspectTable(profile.id, schema, table)
          .then((info) => {
            setTableColumns(schema, table, info.columns)
          })
          .catch(() => {
            // Silently ignore column fetch failures
          })
      }
    }
  }, [schemasWithTables, profile.id, setTableColumns])

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
              ) : null}
            </SidebarInset>
          </ResizablePanel>
        </ResizablePanelGroup>
      </SidebarProvider>
      <UnsavedChangesDialog {...dialogProps} />
    </>
  )
}
