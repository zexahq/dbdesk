import type { SQLConnectionProfile } from '@dbdesk/shared/types'
import { useRunQuery } from '@renderer/features/sql-workspace/queries/query'
import { SaveQueryDialog } from '@renderer/components/dialogs/save-query-dialog'
import SqlEditor from '@renderer/features/editor/components/sql-editor'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from '@renderer/components/ui/resizable'
import { useSavedQueriesStore } from '@renderer/features/sql-workspace/stores/saved-queries-store'
import { useTabStore } from '@renderer/features/sql-workspace/stores/tab-store'
import { toast } from '@renderer/shared/lib/toast'
import type { editor } from 'monaco-editor'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getEditorQueries, hasDangerousSqlKeywords } from '@renderer/features/editor/lib/sql-parser'
import { QueryBottombar } from './query-bottombar'
import { QueryResults } from './query-results'

interface QueryViewProps {
  profile: SQLConnectionProfile
  tabId: string
}

export function QueryView({ profile, tabId }: QueryViewProps) {
  const activeTab = useTabStore((s) => s.findQueryTabById(tabId))
  const queries = useSavedQueriesStore((s) => s.queries)
  const saveQuery = useSavedQueriesStore((s) => s.saveQuery)
  const updateQuery = useSavedQueriesStore((s) => s.updateQuery)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const editorInstanceRef = useRef<editor.IStandaloneCodeEditor | null>(null)

  const {
    mutateAsync: runQueryMutation,
    isPending: isExecuting,
    error: executionError
  } = useRunQuery(profile.id)

  const isQueryTabSaved = activeTab ? queries.some((q) => q.id === activeTab.id) : false
  const updateQueryTab = useTabStore((s) => s.updateQueryTab)

  // Refs to avoid re-registering the global keydown listener on every render
  const activeTabRef = useRef(activeTab)
  activeTabRef.current = activeTab
  const isQueryTabSavedRef = useRef(isQueryTabSaved)
  isQueryTabSavedRef.current = isQueryTabSaved

  const handleUpdateQuery = async () => {
    const tab = activeTabRef.current
    if (!tab) return
    const savedQuery = queries.find((q) => q.id === tab.id)
    if (!savedQuery) return

    try {
      await updateQuery(profile.id, tab.id, savedQuery.name, tab.editorContent)
      updateQueryTab(tab.id, { lastSavedContent: tab.editorContent })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save query')
    }
  }

  const handleUpdateQueryRef = useRef(handleUpdateQuery)
  handleUpdateQueryRef.current = handleUpdateQuery

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        const tab = activeTabRef.current
        if (!tab) return
        if (!tab.editorContent.trim()) {
          toast.error('Query cannot be empty')
          return
        }

        if (isQueryTabSavedRef.current) {
          void handleUpdateQueryRef.current()
        } else {
          setSaveDialogOpen(true)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const executeQueries = useCallback(
    async (queriesToRun: string[], limit: number, offset: number) => {
      if (!activeTab) return
      try {
        const results = await runQueryMutation({
          queries: queriesToRun,
          options: { limit, offset }
        })
        updateQueryTab(activeTab.id, {
          queryResults: undefined,
          batchResults: results,
          activeResultIndex: 0,
          limit,
          offset
        })
      } catch {
        updateQueryTab(activeTab.id, {
          queryResults: undefined,
          batchResults: undefined,
          activeResultIndex: undefined
        })
      }
    },
    [activeTab?.id, runQueryMutation, updateQueryTab]
  )

  const handleRunQuery = async (targetQuery?: string) => {
    if (!activeTab) return
    const rawQuery = targetQuery ?? activeTab.editorContent.trim()
    if (!rawQuery) {
      toast.error('Query cannot be empty')
      return
    }

    const blocks = getEditorQueries(rawQuery)
    const totalQueries = blocks.flatMap((b) => b.queries)

    if (totalQueries.length === 0) {
      toast.error('No valid queries found')
      return
    }

    // Dangerous query warning
    const hasDangerous = totalQueries.some((q) => hasDangerousSqlKeywords(q))
    if (hasDangerous) {
      const confirmed = window.confirm(
        'This query contains potentially destructive operations (DELETE, UPDATE, DROP, etc.). Are you sure you want to execute it?'
      )
      if (!confirmed) return
    }

    const limit = activeTab.limit ?? 50
    const offset = 0
    await executeQueries(totalQueries, limit, offset)
  }

  const handleSaveQuery = async (name: string) => {
    if (!activeTab) return
    try {
      await saveQuery(profile.id, activeTab.id, name, activeTab.editorContent)
      updateQueryTab(activeTab.id, { name, lastSavedContent: activeTab.editorContent })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save query')
    }
  }

  // Derive the active result for display (always from batch results)
  const activeBatchResult =
    activeTab?.batchResults && activeTab.activeResultIndex !== undefined
      ? activeTab.batchResults[activeTab.activeResultIndex]
      : undefined

  const displayedBatchResult = activeTab?.batchResults ? activeBatchResult : undefined
  const displayedError = activeBatchResult?.error ?? executionError?.message
  const displayedTotalRows = activeBatchResult
    ? (activeBatchResult.result?.totalRowCount ?? activeBatchResult.result?.rowCount ?? 0)
    : 0
  const displayedExecutionTime = activeBatchResult?.executionTime

  if (!activeTab) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        Tab not found
      </div>
    )
  }

  return (
    <>
      <ResizablePanelGroup direction="vertical" className="flex-1">
        <ResizablePanel defaultSize={50} minSize={20}>
          <div className="h-full w-full">
            <SqlEditor
              tabId={activeTab.id}
              value={activeTab.editorContent}
              onChange={(value) => updateQueryTab(activeTab.id, { editorContent: value })}
              language={profile.type}
              onExecute={() => void handleRunQuery()}
              onEditorMount={(instance) => {
                editorInstanceRef.current = instance
              }}
            />
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={50} minSize={30}>
          <QueryResults
            batchResult={displayedBatchResult}
            batchResults={activeTab.batchResults}
            activeResultIndex={activeTab.activeResultIndex}
            onActiveResultChange={(index) =>
              updateQueryTab(activeTab.id, { activeResultIndex: index })
            }
            isLoading={isExecuting}
            error={displayedError}
            onRun={() => void handleRunQuery()}
          />
        </ResizablePanel>
      </ResizablePanelGroup>

      {activeTab.batchResults && (
        <QueryBottombar
          totalRows={displayedTotalRows}
          executionTime={displayedExecutionTime}
          limit={activeTab.limit}
          offset={activeTab.offset}
          isPaginationEnabled={false}
          batchInfo={{
            totalQueries: activeTab.batchResults.length,
            activeIndex: activeTab.activeResultIndex ?? 0,
            hasErrors: activeTab.batchResults.some((r) => r.error)
          }}
          onLimitChange={async () => {
            // No pagination for batch queries
          }}
          onOffsetChange={async () => {
            // No pagination for batch queries
          }}
        />
      )}

      <SaveQueryDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        onSave={handleSaveQuery}
      />
    </>
  )
}
