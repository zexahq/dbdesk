import type { SQLConnectionProfile } from '@common/types'
import SqlEditor from '@renderer/components/editor/sql-editor'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from '@renderer/components/ui/resizable'
import { SidebarInset, SidebarProvider } from '@renderer/components/ui/sidebar'
import { cn } from '@renderer/lib/utils'
import { useState } from 'react'
import { QueryResults } from './query-results'
import { QuerySidebar } from './query-sidebar'
import { QueryTopbar } from './query-topbar'

interface SqlQueryViewProps {
  profile: SQLConnectionProfile
}

export default function SqlQueryView({ profile }: SqlQueryViewProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const handleRefresh = () => {
    // Will be implemented later for refreshing saved queries
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
          <QuerySidebar profile={profile} onRefresh={handleRefresh} />
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
                  <SqlEditor />
                </div>
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel defaultSize={50} minSize={30}>
                <QueryResults />
              </ResizablePanel>
            </ResizablePanelGroup>
          </SidebarInset>
        </ResizablePanel>
      </ResizablePanelGroup>
    </SidebarProvider>
  )
}
