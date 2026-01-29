/**
 * Table Widget Component
 * Displays query results in a tabular format
 */

import { Pencil, RefreshCw, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@renderer/components/ui/table'
import type { TableWidgetSettings, WidgetComponentProps } from '../types'
import { TablePlaceholder } from './placeholders'
import { useWidgetData } from './useWidgetData'

export function TableWidget({
  widget,
  connectionId,
  isEditMode,
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

  const handleRefresh = () => {
    refetch()
    onRefresh?.()
  }

  const formatCellValue = (value: unknown): string => {
    if (value === null || value === undefined) {
      return '—'
    }
    if (typeof value === 'object') {
      return JSON.stringify(value)
    }
    return String(value)
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium truncate">{title}</CardTitle>
        {isEditMode && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleRefresh}
              title="Refresh"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onEdit?.(widget)}
              title="Edit"
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={() => onDelete?.(widget.id)}
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-pulse space-y-2 w-full">
              <div className="h-8 bg-muted rounded" />
              <div className="h-6 bg-muted rounded" />
              <div className="h-6 bg-muted rounded" />
              <div className="h-6 bg-muted rounded" />
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center text-sm text-destructive">
            {error instanceof Error ? error.message : 'Failed to load data'}
          </div>
        ) : !queryData?.rows?.length ? (
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
      </CardContent>
    </Card>
  )
}
