import type { QueryBatchResult, QueryResult, SQLConnectionProfile } from '@dbdesk/shared/types'
import { SaveQueryDialog } from '@renderer/components/dialogs/save-query-dialog'
import { DangerousQueryDialog } from '@renderer/features/sql-workspace/components/dialogs/dangerous-query-dialog'
import SqlEditor from '@renderer/features/editor/components/sql-editor'
import { getEditorQueries, getQueryTabLabel, hasDangerousSqlKeywords } from '@renderer/features/editor/lib/sql-parser'
import { useRunManyQueries, useCancelQuery, useRunQuery } from '@renderer/features/sql-workspace/queries/query'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from '@renderer/components/ui/resizable'
import { useSavedQueriesStore } from '@renderer/features/sql-workspace/stores/saved-queries-store'
import { useTabStore } from '@renderer/features/sql-workspace/stores/tab-store'
import { toast } from '@renderer/shared/lib/toast'
import { useCallback, useEffect, useRef, useState } from 'react'
import { QueryBottombar } from './query-bottombar'
import { QueryResults } from './query-results'

interface QueryViewProps {
  profile: SQLConnectionProfile
  tabId: string
}

type PendingExecution = {
  queries: string[]
  limit: number
  offset: number
}

export function QueryView({ profile, tabId }: QueryViewProps) {
  const activeTab = useTabStore((s) => s.findQueryTabById(tabId))
  const queries = useSavedQueriesStore((s) => s.queries)
  const saveQuery = useSavedQueriesStore((s) => s.saveQuery)
  const updateQuery = useSavedQueriesStore((s) => s.updateQuery)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [pendingExecution, setPendingExecution] = useState<PendingExecution | null>(null)

  const {
    mutateAsync: runQueryMutation,
    isPending: isRunningSingleQuery,
    error: singleQueryError
  } = useRunQuery(profile.id)
  const {
    mutateAsync: runManyQueriesMutation,
    isPending: isRunningBatchQuery,
    error: batchQueryError
  } = useRunManyQueries(profile.id)
  const { mutateAsync: cancelQueryMutation } = useCancelQuery(profile.id)

  const isExecuting = isRunningSingleQuery || isRunningBatchQuery
  const executionError = batchQueryError ?? singleQueryError

  const updateQueryTab = useTabStore((s) => s.updateQueryTab)

  // Tracks the queryId of the in-flight execution so the user can cancel it.
  const currentQueryIdRef = useRef<string | null>(null)

  const isQueryTabSaved = queries.some((q) => q.id === tabId)

  // Refs let the keydown handler read the latest saved state without re-binding.
  const isQueryTabSavedRef = useRef(isQueryTabSaved)
  isQueryTabSavedRef.current = isQueryTabSaved

  const handleUpdateQuery = async () => {
    if (!activeTab) return
    const savedQuery = queries.find((q) => q.id === activeTab.id)
    if (!savedQuery) return

    try {
      await updateQuery(profile.id, activeTab.id, savedQuery.name, activeTab.editorContent)
      updateQueryTab(activeTab.id, { lastSavedContent: activeTab.editorContent })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save query')
    }
  }

  const handleUpdateQueryRef = useRef(handleUpdateQuery)
  handleUpdateQueryRef.current = handleUpdateQuery

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        if (!activeTab) return
        e.preventDefault()
        if (!activeTab.editorContent.trim()) {
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
  }, [activeTab])

  const handleCancelQuery = useCallback(async () => {
    const queryId = currentQueryIdRef.current
    if (!queryId) return
    try {
      await cancelQueryMutation(queryId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel query')
    }
  }, [cancelQueryMutation])

  if (!activeTab) {
    return null
  }
  const activeBatchResult = activeTab.batchResults?.[activeTab.activeResultIndex ?? 0]

  const updateSingleQueryResult = (query: string, result: QueryResult) => {
    updateQueryTab(activeTab.id, {
      queryResults: result,
      batchResults: undefined,
      activeResultIndex: 0,
      lastExecutedQuery: query,
      limit: result.limit ?? activeTab.limit,
      offset: result.offset ?? activeTab.offset,
      totalRowCount: result.totalRowCount
    })
  }

  const updateBatchQueryResult = (results: QueryBatchResult[], limit: number, offset: number) => {
    updateQueryTab(activeTab.id, {
      queryResults: undefined,
      batchResults: results,
      activeResultIndex: 0,
      lastExecutedQuery: undefined,
      limit,
      offset,
      totalRowCount: undefined
    })
  }

  const clearQueryResults = () => {
    updateQueryTab(activeTab.id, {
      queryResults: undefined,
      batchResults: undefined,
      activeResultIndex: 0,
      lastExecutedQuery: undefined,
      totalRowCount: undefined
    })
  }

  const executeQueries = async (queriesToRun: string[], limit: number, offset: number) => {
    if (queriesToRun.length === 0) {
      toast.error('Query cannot be empty')
      return
    }

    try {
      const results = await runManyQueriesMutation({
        queries: queriesToRun,
        options: { limit, offset }
      })
      updateBatchQueryResult(results, limit, offset)
    } catch {
      clearQueryResults()
    }
  }

  const queueDangerousExecution = async (queriesToRun: string[], limit: number, offset: number) => {
    if (queriesToRun.some((query) => hasDangerousSqlKeywords(query))) {
      setPendingExecution({ queries: queriesToRun, limit, offset })
      return
    }

    await executeQueries(queriesToRun, limit, offset)
  }

  const handleRunQuery = async () => {
    const blocks = getEditorQueries(activeTab.editorContent)
    if (blocks.length === 0) {
      toast.error('Query cannot be empty')
      return
    }

    const limit = activeTab.limit ?? 50
    const offset = 0
    const queriesToRun = blocks.flatMap((block) => block.queries).filter(Boolean)

    await queueDangerousExecution(queriesToRun, limit, offset)
  }

  const executeSingleQueryWithPagination = async (query: string, limit: number, offset: number) => {
    try {
      const result = await runQueryMutation({ query, options: { limit, offset } })
      updateSingleQueryResult(query, result)
    } catch {
      clearQueryResults()
    }
  }

  const executeBatchResultWithPagination = async (limit: number, offset: number) => {
    const batchResults = activeTab.batchResults
    const activeResultIndex = activeTab.activeResultIndex ?? 0
    const resultToUpdate = batchResults?.[activeResultIndex]
    if (!batchResults || !resultToUpdate) {
      return
    }

    try {
      const result = await runQueryMutation({
        query: resultToUpdate.query,
        options: { limit, offset }
      })

      const nextBatchResults = batchResults.map((batchResult, index) =>
        index === activeResultIndex
          ? {
              query: batchResult.query,
              result,
              executionTime: result.executionTime ?? batchResult.executionTime
            }
          : batchResult
      )

      updateQueryTab(activeTab.id, {
        batchResults: nextBatchResults,
        limit: result.limit ?? limit,
        offset: result.offset ?? offset,
        totalRowCount: undefined
      })
    } catch (error) {
      const nextBatchResults = batchResults.map((batchResult, index) =>
        index === activeResultIndex
          ? {
              query: batchResult.query,
              error: error instanceof Error ? error.message : 'Failed to execute query',
              executionTime: batchResult.executionTime
            }
          : batchResult
      )

      updateQueryTab(activeTab.id, { batchResults: nextBatchResults })
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
        <ResizablePanel defaultSize={50} minSize={20}>
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
            batchResults={activeTab.batchResults}
            activeResultIndex={activeTab.activeResultIndex}
            isLoading={isExecuting}
            error={executionError}
            onRun={handleRunQuery}
            onResultSelect={(index) => {
              const result = activeTab.batchResults?.[index]?.result
              updateQueryTab(activeTab.id, {
                activeResultIndex: index,
                limit: result?.limit ?? activeTab.limit,
                offset: result?.offset ?? 0
              })
            }}
            onCancel={handleCancelQuery}
          />
        </ResizablePanel>
      </ResizablePanelGroup>

      {(activeTab.queryResults || activeBatchResult) && (
        <QueryBottombar
          resultLabel={
            activeTab.batchResults
              ? `${getQueryTabLabel(activeTab.batchResults[activeTab.activeResultIndex ?? 0]?.query ?? '')} (${(activeTab.activeResultIndex ?? 0) + 1} of ${activeTab.batchResults.length})`
              : undefined
          }
          totalRows={
            activeBatchResult?.result
              ? activeBatchResult.result.totalRowCount ?? activeBatchResult.result.rowCount
              : activeTab.queryResults
                ? activeTab.totalRowCount ?? activeTab.queryResults.rowCount
                : 0
          }
          executionTime={
            activeBatchResult?.result?.executionTime ??
            activeBatchResult?.executionTime ??
            activeTab.queryResults?.executionTime
          }
          limit={activeTab.limit}
          offset={activeTab.offset}
          isPaginationEnabled={
            activeBatchResult?.result?.totalRowCount !== undefined ||
            activeTab.totalRowCount !== undefined
          }
          onLimitChange={async (limit) => {
            if (activeTab.batchResults) {
              await executeBatchResultWithPagination(limit, 0)
              return
            }

            const query = activeTab.lastExecutedQuery ?? activeTab.editorContent.trim()
            await executeSingleQueryWithPagination(query, limit, 0)
          }}
          onOffsetChange={async (offset) => {
            if (activeTab.batchResults) {
              await executeBatchResultWithPagination(activeTab.limit, offset)
              return
            }

            const query = activeTab.lastExecutedQuery ?? activeTab.editorContent.trim()
            await executeSingleQueryWithPagination(query, activeTab.limit, offset)
          }}
        />
      )}

      <SaveQueryDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        onSave={handleSaveQuery}
      />

      <DangerousQueryDialog
        open={pendingExecution !== null}
        queryCount={pendingExecution?.queries.length ?? 0}
        onOpenChange={(open) => {
          if (!open) {
            setPendingExecution(null)
          }
        }}
        onConfirm={() => {
          const execution = pendingExecution
          setPendingExecution(null)
          if (!execution) {
            return
          }

          void executeQueries(execution.queries, execution.limit, execution.offset)
        }}
      />
    </>
  )
}
