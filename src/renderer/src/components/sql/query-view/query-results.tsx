import type { QueryResult } from '@common/types'
import { Button } from '@renderer/components/ui/button'
import { cleanErrorMessage } from '@renderer/lib/utils'
import { Play } from 'lucide-react'
import { SimpleTable } from './simple-table'

interface QueryResultsProps {
  queryResults?: QueryResult
  isLoading?: boolean
  error?: Error | null
  onRun: () => void
}

export function QueryResults({ queryResults, isLoading, error, onRun }: QueryResultsProps) {
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
        ) : queryResults ? (
          <div className="w-full h-full">
            <SimpleTable columns={queryResults.columns} data={queryResults.rows} />
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
