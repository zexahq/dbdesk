import type { QueryResult } from '@dbdesk/shared/types'
import { Button } from '@renderer/components/ui/button'
import { cleanErrorMessage } from '@renderer/shared/lib/utils'
import { Play, Square } from 'lucide-react'
import { SimpleTable } from './simple-table'

interface QueryResultsProps {
  queryResults?: QueryResult
  isLoading?: boolean
  error?: Error | null
  onRun: () => void
  onCancel?: () => void
}

export function QueryResults({ queryResults, isLoading, error, onRun, onCancel }: QueryResultsProps) {
  return (
    <div className="flex h-full w-full flex-col border-t">
      <div className="flex items-center justify-end gap-2 border-b p-2">
        {isLoading && onCancel && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs cursor-pointer"
            onClick={onCancel}
          >
            <Square className="size-3.5" />
            STOP
          </Button>
        )}
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
