import type { QueryBatchResult, QueryResult } from '@dbdesk/shared/types'
import { Button } from '@renderer/components/ui/button'
import { cleanErrorMessage } from '@renderer/shared/lib/utils'
import { cn } from '@renderer/shared/lib/utils'
import { AlertCircle, CheckCircle2, FileText, Play } from 'lucide-react'
import { SimpleTable } from './simple-table'

interface QueryResultsProps {
  queryResults?: QueryResult
  batchResults?: QueryBatchResult[]
  activeResultIndex?: number
  onActiveResultChange?: (index: number) => void
  isLoading?: boolean
  error?: Error | null
  onRun: () => void
}

function BatchResultTabs({
  batchResults,
  activeIndex,
  onChange
}: {
  batchResults: QueryBatchResult[]
  activeIndex: number
  onChange: (index: number) => void
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b px-2 py-1">
      {batchResults.map((br, i) => {
        const isActive = i === activeIndex
        const hasError = !!br.error
        const hasData = br.result && br.result.columns.length > 0
        return (
          <button
            key={i}
            onClick={() => onChange(i)}
            className={cn(
              'flex items-center gap-1 rounded px-2 py-1 text-xs font-medium cursor-pointer whitespace-nowrap',
              isActive
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/50'
            )}
          >
            {hasError ? (
              <AlertCircle className="size-3 text-destructive" />
            ) : hasData ? (
              <CheckCircle2 className="size-3 text-green-500" />
            ) : (
              <FileText className="size-3" />
            )}
            Query {i + 1}
          </button>
        )
      })}
    </div>
  )
}

function SingleResultView({ result, error }: { result?: QueryResult; error?: string }) {
  if (error) {
    return (
      <div className="flex w-full items-center justify-center text-center text-destructive p-4">
        <p>Error: {cleanErrorMessage(error)}</p>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="flex p-2 w-full items-center text-center text-muted-foreground">
        <p>No data returned</p>
      </div>
    )
  }

  if (result.totalRowCount !== undefined && result.columns.length > 0) {
    return <SimpleTable columns={result.columns} data={result.rows} />
  }

  return (
    <div className="flex p-2 w-full items-center text-center text-muted-foreground">
      <p>Statement executed successfully</p>
    </div>
  )
}

export function QueryResults({
  queryResults,
  batchResults,
  activeResultIndex,
  onActiveResultChange,
  isLoading,
  error,
  onRun
}: QueryResultsProps) {
  return (
    <div className="flex h-full w-full flex-col border-t">
      <div className="flex items-center justify-end border-b p-2">
        <Button
          size="sm"
          className="h-8 text-xs cursor-pointer"
          onClick={onRun}
          disabled={isLoading}
        >
          <Play className="size-4" />
          RUN
        </Button>
      </div>

      {batchResults && batchResults.length > 0 && onActiveResultChange && (
        <BatchResultTabs
          batchResults={batchResults}
          activeIndex={activeResultIndex ?? 0}
          onChange={onActiveResultChange}
        />
      )}

      <div className="flex flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex w-full items-center justify-center text-center text-muted-foreground">
            <div>
              <p className="text-lg font-medium">Executing query...</p>
              <p className="text-sm">Please wait</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex w-full items-center justify-center text-center text-destructive">
            <p>Error: {cleanErrorMessage(error.message)}</p>
          </div>
        ) : batchResults && batchResults.length > 0 ? (
          <div className="w-full h-full">
            <SingleResultView
              result={batchResults[activeResultIndex ?? 0]?.result}
              error={batchResults[activeResultIndex ?? 0]?.error}
            />
          </div>
        ) : queryResults ? (
          <div className="w-full h-full">
            {queryResults.totalRowCount !== undefined && queryResults.columns.length > 0 ? (
              <SimpleTable columns={queryResults.columns} data={queryResults.rows} />
            ) : (
              <div className="flex p-2 w-full items-center text-center text-muted-foreground">
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
