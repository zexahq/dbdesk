import type { SQLConnectionProfile } from '@common/types'
import { useRunQuery } from '@renderer/api/queries/query'
import { SaveQueryDialog } from '@renderer/components/dialogs/save-query-dialog'
import SqlEditor from '@renderer/components/editor/sql-editor'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from '@renderer/components/ui/resizable'
import { useSavedQueriesStore } from '@renderer/store/saved-queries-store'
import { QueryTab, useTabStore } from '@renderer/store/tab-store'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { QueryResults } from './query-results'

interface QueryViewProps {
  profile: SQLConnectionProfile
  activeTab: QueryTab
}

export function QueryView({ profile, activeTab }: QueryViewProps) {
  const queries = useSavedQueriesStore((s) => s.queries)
  const saveQuery = useSavedQueriesStore((s) => s.saveQuery)
  const updateQuery = useSavedQueriesStore((s) => s.updateQuery)
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionError, setExecutionError] = useState<Error | null>(null)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)

  const { mutateAsync: runQuery } = useRunQuery(profile.id)

  const isQueryTabSaved = queries.some((q) => q.id === activeTab.id)
  const updateQueryTab = useTabStore((s) => s.updateQueryTab)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (!activeTab.editorContent.trim()) {
          toast.error('Query cannot be empty')
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
  }, [activeTab, isQueryTabSaved])

  const handleRunQuery = async () => {
    const query = activeTab.editorContent.trim()
    if (!query) {
      toast.error('Query cannot be empty')
      return
    }

    setIsExecuting(true)
    setExecutionError(null)

    try {
      const data = await runQuery(query)
      updateQueryTab(activeTab.id, { queryResults: data })
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to execute query')
      setExecutionError(err)
      updateQueryTab(activeTab.id, { queryResults: undefined })
      toast.error(err.message)
    } finally {
      setIsExecuting(false)
    }
  }

  const handleUpdateQuery = async () => {
    const savedQuery = queries.find((q) => q.id === activeTab.id)
    if (!savedQuery) return

    try {
      await updateQuery(profile.id, activeTab.id, savedQuery.name, activeTab.editorContent)
      updateQueryTab(activeTab.id, { lastSavedContent: activeTab.editorContent })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save query')
    }
  }

  const handleSaveQuery = async (name: string) => {
    try {
      await saveQuery(profile.id, activeTab.id, name, activeTab.editorContent)
      updateQueryTab(activeTab.id, { name, lastSavedContent: activeTab.editorContent })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save query')
    }
  }

  return (
    <>
      <ResizablePanelGroup direction="vertical" className="flex-1">
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full w-full">
            <SqlEditor
              tabId={activeTab.id}
              value={activeTab.editorContent}
              onChange={(value) => updateQueryTab(activeTab.id, { editorContent: value })}
              language={profile.type}
              onExecute={handleRunQuery}
            />
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={50} minSize={30}>
          <QueryResults
            queryResults={activeTab.queryResults}
            isLoading={isExecuting}
            error={executionError}
            onRun={handleRunQuery}
          />
        </ResizablePanel>
      </ResizablePanelGroup>

      <SaveQueryDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        onSave={handleSaveQuery}
      />
    </>
  )
}
