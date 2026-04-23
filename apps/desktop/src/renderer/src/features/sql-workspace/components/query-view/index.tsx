import type { SQLConnectionProfile } from '@dbdesk/shared/types'
import { useRunQuery, useRunManyQueries } from '@renderer/features/sql-workspace/queries/query'
import { SaveQueryDialog } from '@renderer/components/dialogs/save-query-dialog'
import SqlEditor from '@renderer/features/editor/components/sql-editor'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from '@renderer/components/ui/resizable'
import { useSavedQueriesStore } from '@renderer/features/sql-workspace/stores/saved-queries-store'
import { QueryTab, useTabStore } from '@renderer/features/sql-workspace/stores/tab-store'
import { toast } from '@renderer/shared/lib/toast'
import { useCallback, useEffect, useRef, useState } from 'react'
import { QueryBottombar } from './query-bottombar'
import { QueryResults } from './query-results'
import { getEditorQueries, hasDangerousSqlKeywords } from '@renderer/features/editor/lib/sql-parser'
import { DangerousQueryDialog } from '@renderer/features/sql-workspace/components/dialogs/dangerous-query-dialog'
import type { editor } from 'monaco-editor'

interface QueryViewProps {
  profile: SQLConnectionProfile
  activeTab: QueryTab
}

export function QueryView({ profile, activeTab }: QueryViewProps) {
  const queries = useSavedQueriesStore((s) => s.queries)
  const saveQuery = useSavedQueriesStore((s) => s.saveQuery)
  const updateQuery = useSavedQueriesStore((s) => s.updateQuery)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [dangerousDialogOpen, setDangerousDialogOpen] = useState(false)
  const [pendingQueries, setPendingQueries] = useState<string[]>([])
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)

  const {
    mutateAsync: runQueryMutation,
    isPending: isExecutingSingle,
    error: singleExecutionError
  } = useRunQuery(profile.id)

  const {
    mutateAsync: runManyQueriesMutation,
    isPending: isExecutingBatch,
    error: batchExecutionError
  } = useRunManyQueries(profile.id)

  const isExecuting = isExecutingSingle || isExecutingBatch
  const executionError = singleExecutionError || batchExecutionError

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

  const executeQueryWithPagination = useCallback(
    async (limit: number, offset: number) => {
      const rawQuery = activeTab.editorContent.trim()
      if (!rawQuery) {
        toast.error('Query cannot be empty')
        return
      }

      try {
        const result = await runQueryMutation({ query: rawQuery, options: { limit, offset } })
        updateQueryTab(activeTab.id, {
          queryResults: result,
          batchResults: undefined,
          activeResultIndex: undefined,
          limit: result.limit,
          offset: result.offset,
          totalRowCount: result.totalRowCount
        })
      } catch {
        updateQueryTab(activeTab.id, { queryResults: undefined, batchResults: undefined })
      }
    },
    [activeTab.editorContent, activeTab.id, runQueryMutation, updateQueryTab]
  )

  const executeQueries = useCallback(
    async (queriesToRun: string[]) => {
      const limit = activeTab.limit ?? 50
      const offset = 0

      if (queriesToRun.length === 1) {
        try {
          const result = await runQueryMutation({
            query: queriesToRun[0],
            options: { limit, offset }
          })
          updateQueryTab(activeTab.id, {
            queryResults: result,
            batchResults: undefined,
            activeResultIndex: undefined,
            limit: result.limit,
            offset: result.offset,
            totalRowCount: result.totalRowCount
          })
        } catch {
          updateQueryTab(activeTab.id, { queryResults: undefined, batchResults: undefined })
        }
      } else {
        try {
          const batchResults = await runManyQueriesMutation({
            queries: queriesToRun,
            options: { limit, offset }
          })
          updateQueryTab(activeTab.id, {
            queryResults: undefined,
            batchResults,
            activeResultIndex: 0,
            totalRowCount: undefined
          })
        } catch {
          updateQueryTab(activeTab.id, { queryResults: undefined, batchResults: undefined })
        }
      }
    },
    [activeTab.id, activeTab.limit, runQueryMutation, runManyQueriesMutation, updateQueryTab]
  )

  const handleRunQuery = async () => {
    const rawContent = activeTab.editorContent.trim()
    if (!rawContent) {
      toast.error('Query cannot be empty')
      return
    }

    // Parse into blocks and collect all queries
    const blocks = getEditorQueries(rawContent)
    const allQueries = blocks.flatMap((b) => b.queries)

    if (allQueries.length === 0) {
      toast.error('No valid queries found')
      return
    }

    // Check for dangerous keywords
    if (allQueries.some(hasDangerousSqlKeywords)) {
      setPendingQueries(allQueries)
      setDangerousDialogOpen(true)
      return
    }

    await executeQueries(allQueries)
  }

  const handleConfirmDangerousQuery = async () => {
    setDangerousDialogOpen(false)
    await executeQueries(pendingQueries)
    setPendingQueries([])
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

  const handleEditorMount = useCallback((editorInstance: editor.IStandaloneCodeEditor) => {
    editorRef.current = editorInstance
  }, [])

  // Active batch result for bottom bar
  const activeBatchResult =
    activeTab.batchResults && activeTab.activeResultIndex !== undefined
      ? activeTab.batchResults[activeTab.activeResultIndex]
      : undefined

  const showBottombar = activeTab.queryResults || activeBatchResult?.result

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
              onExecute={handleRunQuery}
              onEditorMount={handleEditorMount}
            />
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={50} minSize={30}>
          <QueryResults
            queryResults={activeTab.queryResults}
            batchResults={activeTab.batchResults}
            activeResultIndex={activeTab.activeResultIndex}
            onActiveResultChange={(index) =>
              updateQueryTab(activeTab.id, { activeResultIndex: index })
            }
            isLoading={isExecuting}
            error={executionError}
            onRun={handleRunQuery}
          />
        </ResizablePanel>
      </ResizablePanelGroup>

      {showBottombar && (
        <QueryBottombar
          totalRows={
            activeTab.batchResults
              ? activeBatchResult?.result?.totalRowCount ?? activeBatchResult?.result?.rowCount ?? 0
              : activeTab.totalRowCount ?? activeTab.queryResults!.rowCount
          }
          executionTime={
            activeTab.batchResults
              ? activeBatchResult?.executionTime
              : activeTab.queryResults!.executionTime
          }
          limit={activeTab.limit}
          offset={activeTab.offset}
          isPaginationEnabled={
            activeTab.batchResults
              ? activeBatchResult?.result?.totalRowCount !== undefined
              : activeTab.totalRowCount !== undefined
          }
          batchInfo={
            activeTab.batchResults
              ? {
                  current: (activeTab.activeResultIndex ?? 0) + 1,
                  total: activeTab.batchResults.length
                }
              : undefined
          }
          onLimitChange={async (limit) => {
            if (!activeTab.batchResults) {
              await executeQueryWithPagination(limit, 0)
            }
          }}
          onOffsetChange={async (offset) => {
            if (!activeTab.batchResults) {
              await executeQueryWithPagination(activeTab.limit, offset)
            }
          }}
        />
      )}

      <SaveQueryDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        onSave={handleSaveQuery}
      />

      <DangerousQueryDialog
        open={dangerousDialogOpen}
        onOpenChange={setDangerousDialogOpen}
        onConfirm={handleConfirmDangerousQuery}
        queries={pendingQueries}
      />
    </>
  )
}
