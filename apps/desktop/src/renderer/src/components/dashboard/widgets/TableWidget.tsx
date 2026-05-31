/**
 * Table Widget Component
 * Displays query results in a tabular format
 */

import { useCallback, useMemo, useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@renderer/components/ui/table'
import type { TableWidgetSettings } from '@common/types'
import type { WidgetComponentProps } from '@renderer/types/dashboard'
import { TablePlaceholder } from './placeholders'
import { useWidgetData } from './useWidgetData'
import { WidgetWrapper } from './WidgetWrapper'

/**
 * Format cell value for display
 */
function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '—'
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}

export function TableWidget({
  widget,
  connectionId,
  isEditMode,
  isExpanded,
  onEdit,
  onDelete,
  onRefresh
}: WidgetComponentProps<TableWidgetSettings>) {
  const { settings, title } = widget
  const [currentPage, setCurrentPage] = useState(0)
  const pageSize = settings.pageSize ?? 10

  // Fetch query data using shared hook
  const {
    data: queryData,
    isLoading,
    error,
    refetch,
    hasQuery
  } = useWidgetData(widget, connectionId, { limit: 1000 })

  // Get columns to display
  const columns = useMemo(() => {
    if (settings.columns?.length) {
      return settings.columns
    }
    if (queryData?.columns?.length) {
      return queryData.columns
    }
    if (queryData?.rows?.length) {
      return Object.keys(queryData.rows[0] as Record<string, unknown>)
    }
    return []
  }, [settings.columns, queryData])

  // Paginate rows
  const paginatedRows = useMemo(() => {
    if (!queryData?.rows) return []
    const start = currentPage * pageSize
    return queryData.rows.slice(start, start + pageSize)
  }, [queryData?.rows, currentPage, pageSize])

  const totalPages = Math.ceil((queryData?.rows?.length ?? 0) / pageSize)

  const handleRefresh = useCallback(() => {
    refetch()
    onRefresh?.()
  }, [refetch, onRefresh])

  return (
    <WidgetWrapper
      title={title}
      isEditMode={isEditMode}
      isExpanded={isExpanded}
      isLoading={isLoading}
      error={error instanceof Error ? error : null}
      onRefresh={handleRefresh}
      onEdit={() => onEdit?.(widget)}
      onDelete={() => onDelete?.(widget.id)}
      loadingContent={
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse space-y-2 w-full">
            <div className="h-8 bg-muted rounded" />
            <div className="h-6 bg-muted rounded" />
            <div className="h-6 bg-muted rounded" />
            <div className="h-6 bg-muted rounded" />
          </div>
        </div>
      }
    >
      {!queryData?.rows?.length ? (
        <div className="flex-1 flex flex-col w-full">
          <div className="flex-1 w-full">
            <TablePlaceholder />
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            {!hasQuery ? 'Select a query' : 'No data available'}
          </p>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((col) => (
                    <TableHead key={col} className="text-xs">
                      {col}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRows.map((row, idx) => (
                  <TableRow key={idx}>
                    {columns.map((col) => (
                      <TableCell key={col} className="text-xs">
                        {formatCellValue((row as Record<string, unknown>)[col])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-xs text-muted-foreground">
                Page {currentPage + 1} of {totalPages}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage >= totalPages - 1}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </WidgetWrapper>
  )
}
