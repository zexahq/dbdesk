import type { QueryBatchResult, QueryResult } from '@dbdesk/shared/types'
import { Button } from '@renderer/components/ui/button'
import { cleanErrorMessage } from '@renderer/shared/lib/utils'
import { getQueryTabLabel } from '@renderer/features/editor/lib/sql-parser'
import { CircleCheck, CircleX, FileText, Play } from 'lucide-react'
import { SimpleTable } from './simple-table'

interface QueryResultsProps {
  queryResults?: QueryResult
  batchResults?: QueryBatchResult[]
  activeResultIndex?: number
  isLoading?: boolean
  error?: Error | null
  onRun: () => void
  onResultSelect?: (index: number) => void
}

const getBatchResultIcon = (result: QueryBatchResult) => {
  if (result.error) {
    return <CircleX className="size-4 text-destructive" />
  }

  if (result.result?.columns.length) {
    return <CircleCheck className="size-4 text-emerald-600" />
  }

  return <FileText className="size-4 text-muted-foreground" />
}

export function QueryResults({
  queryResults,
  batchResults,
  activeResultIndex,
  isLoading,
  error,
  onRun,
  onResultSelect
}: QueryResultsProps) {
  const safeActiveResultIndex = Math.min(activeResultIndex ?? 0, Math.max((batchResults?.length ?? 1) - 1, 0))
  const activeBatchResult = batchResults?.[safeActiveResultIndex]

  return (
    <div className="flex h-full w-full flex-col border-t">
      <div className="flex flex-col border-b">
        <div className="flex items-center justify-end p-2">
          <Button size="sm" className="h-8 text-xs" onClick={() => onRun()} disabled={isLoading}>
            <Play className="size-4" />
            RUN
          </Button>
        </div>
        {batchResults && batchResults.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto border-t px-2 py-2">
            {batchResults.map((result, index) => (
              <Button
                key={`${result.query}-${index}`}
                variant={index === safeActiveResultIndex ? 'secondary' : 'ghost'}
                size="sm"
                className="shrink-0 max-w-[180px] truncate"
                onClick={() => onResultSelect?.(index)}
                title={result.query}
              >
                {getBatchResultIcon(result)}
                <span className="truncate">{getQueryTabLabel(result.query)}</span>
              </Button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="flex flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex w-full items-center justify-center text-center text-muted-foreground">
            <div>
              <p className="text-lg font-medium">Executing query...</p>
              <p className="text-sm">Please wait</p>
            </div>
          </div>
        ) : batchResults && batchResults.length > 0 ? (
          activeBatchResult?.error ? (
            <div className="flex w-full items-center justify-center text-center text-destructive">
              <p>Error: {cleanErrorMessage(activeBatchResult.error)}</p>
            </div>
          ) : activeBatchResult?.result?.columns.length ? (
            <div className="h-full w-full">
              <SimpleTable columns={activeBatchResult.result.columns} data={activeBatchResult.result.rows} />
            </div>
          ) : activeBatchResult?.result ? (
            <div className="flex w-full items-center justify-center text-center text-muted-foreground">
              <p className="font-mono text-sm">{activeBatchResult.result.commandTag ?? 'OK'}</p>
            </div>
          ) : error ? (
            <div className="flex w-full items-center justify-center text-center text-destructive">
              <p>Error: {cleanErrorMessage(error.message)}</p>
            </div>
          ) : (
            <div className="flex w-full items-center justify-center text-center text-muted-foreground">
              <p>Select a query result to inspect</p>
            </div>
          )
        ) : error ? (
          <div className="flex w-full items-center justify-center text-center text-destructive">
            <p>Error: {cleanErrorMessage(error.message)}</p>
          </div>
        ) : queryResults ? (
          <div className="h-full w-full">
            {queryResults.columns.length > 0 ? (
              <SimpleTable columns={queryResults.columns} data={queryResults.rows} />
            ) : (
              <div className="flex w-full items-center justify-center p-2 text-center text-muted-foreground">
                <p>Statement executed successfully</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex w-full items-center justify-center text-center text-muted-foreground">
            <div>
              <p className="text-lg font-medium">Query Results</p>
              <p className="text-sm">Execute a query to see results here</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
