import type { SQLConnectionProfile } from '@common/types'
import { useRunQuery } from '@renderer/api/queries/query'
import SqlEditor from '@renderer/components/editor/sql-editor'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from '@renderer/components/ui/resizable'
import { SidebarInset, SidebarProvider } from '@renderer/components/ui/sidebar'
import { cn } from '@renderer/lib/utils'
import { useQueryTabStore } from '@renderer/store/query-tab-store'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { QueryResults } from './query-results'
import { QuerySidebar } from './query-sidebar'
import { QueryTopbar } from './query-topbar'

interface SqlQueryViewProps {
  profile: SQLConnectionProfile
}

export default function SqlQueryView({ profile }: SqlQueryViewProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionError, setExecutionError] = useState<Error | null>(null)
  const { tabs, addTab, getActiveTab, updateTab } = useQueryTabStore()
  const activeTab = getActiveTab()
  const { mutateAsync: runQuery } = useRunQuery(profile.id)

  // Initialize with one tab if no tabs exist
  useEffect(() => {
    if (tabs.length === 0) {
      addTab()
    }
  }, [tabs.length, addTab])

  const handleRunQuery = async () => {
    if (!activeTab) {
      toast.error('No active tab')
      return
    }

    const query = activeTab.editorContent.trim()
    if (!query) {
      toast.error('Query cannot be empty')
      return
    }

    setIsExecuting(true)
    setExecutionError(null)

    try {
      const data = await runQuery(query)
      updateTab(activeTab.id, { queryResults: data })
      toast.success('Query executed successfully')
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to execute query')
      setExecutionError(err)
      updateTab(activeTab.id, { queryResults: undefined })
      toast.error(err.message)
    } finally {
      setIsExecuting(false)
    }
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
          <QuerySidebar profile={profile} />
        </ResizablePanel>
        <ResizableHandle withHandle className={cn(!isSidebarOpen && 'hidden')} />
        <ResizablePanel>
          <SidebarInset className="flex h-full flex-col overflow-hidden">
            <QueryTopbar
              profile={profile}
              isSidebarOpen={isSidebarOpen}
              onSidebarOpenChange={setIsSidebarOpen}
            />
            <ResizablePanelGroup direction="vertical" className="flex-1">
              <ResizablePanel defaultSize={50} minSize={30}>
                <div className="h-full w-full">
                  {activeTab && (
                    <SqlEditor
                      tabId={activeTab.id}
                      value={activeTab.editorContent}
                      onChange={(value) => updateTab(activeTab.id, { editorContent: value })}
                      language={profile.type}
                      onExecute={handleRunQuery}
                    />
                  )}
                </div>
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel defaultSize={50} minSize={30}>
                <QueryResults
                  queryResults={activeTab?.queryResults}
                  isLoading={isExecuting}
                  error={executionError}
                  onRun={handleRunQuery}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </SidebarInset>
        </ResizablePanel>
      </ResizablePanelGroup>
    </SidebarProvider>
  )
}