import type { QueryBatchResult, QueryResult } from '@dbdesk/shared/types'
import { Button } from '@renderer/components/ui/button'
import { cleanErrorMessage } from '@renderer/shared/lib/utils'
import { CheckCircle, Play, AlertCircle, FileText } from 'lucide-react'
import { SimpleTable } from './simple-table'

interface QueryResultsProps {
  queryResults?: QueryResult
  batchResult?: QueryBatchResult
  batchResults?: QueryBatchResult[]
  activeResultIndex?: number
  onActiveResultChange?: (index: number) => void
  isLoading?: boolean
  error?: string | null
  onRun: () => void
}

export function QueryResults({
  queryResults,
  batchResult,
  batchResults,
  activeResultIndex,
  onActiveResultChange,
  isLoading,
  error,
  onRun
}: QueryResultsProps) {
  const hasBatch = batchResults && batchResults.length > 0

  return (
    <div className="flex h-full w-full flex-col border-t">
      <div className="flex items-center justify-between border-b p-2">
        {hasBatch && (
          <div className="flex items-center gap-1 overflow-x-auto">
            {batchResults.map((result, index) => {
              const isActive = index === activeResultIndex
              const isError = !!result.error
              const hasData = result.result && result.result.columns.length > 0

              return (
                <Button
                  key={index}
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs shrink-0"
                  onClick={() => onActiveResultChange?.(index)}
                >
                  {isError ? (
                    <AlertCircle className="size-3 text-destructive" />
                  ) : hasData ? (
                    <CheckCircle className="size-3" />
                  ) : (
                    <FileText className="size-3" />
                  )}
                  Query {index + 1}
                </Button>
              )
            })}
          </div>
        )}
        <div className={hasBatch ? '' : 'ml-auto'}>
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
      </div>

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
            <p>Error: {cleanErrorMessage(error)}</p>
          </div>
        ) : batchResult ? (
          <BatchResultView result={batchResult} />
        ) : queryResults ? (
          <div className="w-full h-full">
            {queryResults.columns.length > 0 ? (
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

function BatchResultView({ result }: { result: QueryBatchResult }) {
  if (result.error) {
    return (
      <div className="flex w-full items-center justify-center text-center text-destructive">
        <div className="max-w-lg">
          <AlertCircle className="size-6 mx-auto mb-2" />
          <p className="font-medium">Query failed</p>
          <p className="text-sm mt-1">{cleanErrorMessage(result.error)}</p>
        </div>
      </div>
    )
  }

  if (!result.result) {
    return (
      <div className="flex w-full items-center justify-center text-center text-muted-foreground">
        <p>No data returned</p>
      </div>
    )
  }

  if (result.result.columns.length === 0) {
    return (
      <div className="flex p-2 w-full items-center text-center text-muted-foreground">
        <p>Statement executed successfully</p>
      </div>
    )
  }

  return (
    <div className="w-full h-full">
      <SimpleTable columns={result.result.columns} data={result.result.rows} />
    </div>
  )
}
