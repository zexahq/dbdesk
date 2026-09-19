import type {
  QueryBatchResult,
  QueryResult,
  QueryResultRow,
  TableDataColumn,
  TableDataResult
} from '@dbdesk/shared/types'
import { Button } from '@renderer/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { getColumns } from '@renderer/features/data-table/components/columns'
import { DataTable } from '@renderer/features/data-table/components/data-table'
import { getQueryTabLabel } from '@renderer/features/editor/lib/sql-parser'
import type { QueryPlan } from '@renderer/features/sql-workspace/lib/query-plan'
import {
  useTableIntrospection,
  useUpdateTableCell
} from '@renderer/features/sql-workspace/queries/schema'
import type { PinnedQueryResult } from '@renderer/features/sql-workspace/stores/tab-store'
import { toast } from '@renderer/shared/lib/toast'
import { cleanErrorMessage } from '@renderer/shared/lib/utils'
import type { RowSelectionState } from '@tanstack/react-table'
import {
  ChartNoAxesColumnIncreasing,
  CircleCheck,
  CircleX,
  Copy,
  Download,
  FileText,
  Pencil,
  Pin,
  PinOff,
  Play,
  Square
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  downloadQueryResult,
  getEditableSelectTarget,
  serializeQueryResult,
  type ResultExportFormat
} from './result-tools'
import { QueryPlanView } from './query-plan-view'
import { SimpleTable } from './simple-table'

interface QueryResultsProps {
  connectionId: string
  tabId: string
  currentQuery?: string
  queryResults?: QueryResult
  batchResults?: QueryBatchResult[]
  activeResultIndex?: number
  pinnedResults: PinnedQueryResult[]
  activePinnedResultId?: string
  isLoading?: boolean
  error?: Error | null
  plan?: QueryPlan
  onRun: () => void
  onExplain: () => void
  onExplainAnalyze: () => void
  onResultSelect?: (index: number) => void
  onPinnedResultSelect: (id?: string) => void
  onPinResult: () => void
  onUnpinResult: (id: string) => void
  onResultRowsChange: (rows: QueryResultRow[]) => void
  onCancel?: () => void
}

const getBatchResultIcon = (result: QueryBatchResult) => {
  if (result.error) return <CircleX className="size-4 text-destructive" />
  if (result.result?.columns.length) return <CircleCheck className="size-4 text-emerald-600" />
  return <FileText className="size-4 text-muted-foreground" />
}

export function QueryResults({
  connectionId,
  tabId,
  currentQuery,
  queryResults,
  batchResults,
  activeResultIndex,
  pinnedResults,
  activePinnedResultId,
  isLoading,
  error,
  plan,
  onRun,
  onExplain,
  onExplainAnalyze,
  onResultSelect,
  onPinnedResultSelect,
  onPinResult,
  onUnpinResult,
  onResultRowsChange,
  onCancel
}: QueryResultsProps) {
  const safeActiveResultIndex = Math.min(
    activeResultIndex ?? 0,
    Math.max((batchResults?.length ?? 1) - 1, 0)
  )
  const activeBatchResult = batchResults?.[safeActiveResultIndex]
  const activePinnedResult = pinnedResults.find((result) => result.id === activePinnedResultId)
  const displayedResult = activePinnedResult?.result ?? activeBatchResult?.result ?? queryResults
  const displayedQuery = activePinnedResult?.query ?? activeBatchResult?.query ?? currentQuery
  const displayedError = activePinnedResult
    ? undefined
    : (activeBatchResult?.error ?? error?.message)

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [isEditing, setIsEditing] = useState(false)

  const editableTarget = useMemo(
    () => (activePinnedResult ? null : getEditableSelectTarget(displayedQuery)),
    [activePinnedResult, displayedQuery]
  )
  const {
    data: tableInfo,
    isLoading: isLoadingTableInfo,
    error: tableInfoError
  } = useTableIntrospection(connectionId, editableTarget?.schema, editableTarget?.table)
  const { mutateAsync: updateCell } = useUpdateTableCell(connectionId)

  const editableColumns = useMemo<TableDataColumn[] | null>(() => {
    if (!displayedResult || !tableInfo) return null

    const metadata = new Map(tableInfo.columns.map((column) => [column.name, column]))
    const columns: TableDataColumn[] = []
    for (const name of displayedResult.columns) {
      const column = metadata.get(name)
      if (!column) return null
      columns.push({
        name,
        dataType: column.type,
        isPrimaryKey: column.isPrimaryKey,
        enumValues: column.enumValues,
        foreignKey: column.foreignKey
      })
    }

    return columns
  }, [displayedResult, tableInfo])

  const primaryKeyColumns = useMemo(
    () => tableInfo?.columns.filter((column) => column.isPrimaryKey).map((column) => column.name),
    [tableInfo]
  )

  const editDisabledReason = activePinnedResult
    ? 'Pinned snapshots are read-only.'
    : !displayedResult?.columns.length
      ? 'This result has no editable columns.'
      : !editableTarget
        ? 'Editing requires an exact SELECT * FROM schema.table query.'
        : isLoadingTableInfo
          ? 'Checking table metadata…'
          : tableInfoError
            ? 'Table metadata could not be verified.'
            : !primaryKeyColumns?.length
              ? 'The source table needs a primary key.'
              : !primaryKeyColumns.every((column) => displayedResult.columns.includes(column))
                ? 'All primary key columns must be present in the result.'
                : !editableColumns
                  ? 'The result columns do not match the source table.'
                  : null

  const editableTableData = useMemo<TableDataResult | undefined>(
    () =>
      displayedResult && editableColumns && primaryKeyColumns
        ? {
            rows: displayedResult.rows,
            columns: editableColumns,
            totalCount: displayedResult.totalRowCount ?? displayedResult.rowCount,
            rowCount: displayedResult.rowCount,
            executionTime: displayedResult.executionTime ?? 0,
            primaryKeyColumns
          }
        : undefined,
    [displayedResult, editableColumns, primaryKeyColumns]
  )

  const dataTableColumns = useMemo(
    () => (editableTableData ? getColumns(editableTableData.columns) : []),
    [editableTableData]
  )

  useEffect(() => {
    setRowSelection({})
    setIsEditing(false)
  }, [
    activePinnedResultId,
    displayedQuery,
    displayedResult?.executionTime,
    displayedResult?.offset,
    safeActiveResultIndex
  ])

  const selectedRows = displayedResult?.rows.filter((_, index) => rowSelection[index]) ?? []
  const rowsForTools = selectedRows.length ? selectedRows : (displayedResult?.rows ?? [])

  const handleCopy = async () => {
    if (!displayedResult) return
    try {
      await navigator.clipboard.writeText(
        serializeQueryResult(displayedResult.columns, rowsForTools, 'tsv')
      )
      toast.success(
        `Copied ${rowsForTools.length} row${rowsForTools.length === 1 ? '' : 's'} with headers`
      )
    } catch (copyError) {
      console.error('Failed to copy query result:', copyError)
      toast.error('Failed to copy query result')
    }
  }

  const handleRun = () => {
    setRowSelection({})
    setIsEditing(false)
    onRun()
  }

  const handleExport = (format: ResultExportFormat) => {
    if (!displayedResult) return
    downloadQueryResult(displayedResult.columns, rowsForTools, format)
    toast.success(`Exported ${rowsForTools.length} row${rowsForTools.length === 1 ? '' : 's'}`)
  }

  const handleCellUpdate = async (
    columnToUpdate: string,
    newValue: unknown,
    row: QueryResultRow
  ) => {
    if (!editableTarget || !displayedResult) return

    await updateCell({
      schema: editableTarget.schema,
      table: editableTarget.table,
      columnToUpdate,
      newValue,
      row
    })
    onResultRowsChange(
      displayedResult.rows.map((resultRow) =>
        resultRow === row ? { ...resultRow, [columnToUpdate]: newValue } : resultRow
      )
    )
  }

  const hasResultTools = !plan && Boolean(displayedResult?.columns.length)

  return (
    <div className="flex h-full w-full flex-col border-t">
      <div className="flex flex-col border-b">
        <div className="flex items-center justify-end gap-2 p-2">
          {hasResultTools ? (
            <>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleCopy}>
                <Copy className="size-3.5" />
                COPY {selectedRows.length ? `(${selectedRows.length})` : ''}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="h-8 text-xs">
                    <Download className="size-3.5" />
                    EXPORT
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {(['csv', 'json', 'tsv'] as const).map((format) => (
                    <DropdownMenuItem key={format} onClick={() => handleExport(format)}>
                      Export {format.toUpperCase()}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {activePinnedResult ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => onUnpinResult(activePinnedResult.id)}
                >
                  <PinOff className="size-3.5" />
                  UNPIN
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onPinResult}>
                  <Pin className="size-3.5" />
                  PIN
                </Button>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={editDisabledReason ? 0 : undefined}>
                    <Button
                      size="sm"
                      variant={isEditing ? 'secondary' : 'outline'}
                      className="h-8 text-xs"
                      disabled={Boolean(editDisabledReason)}
                      onClick={() => setIsEditing((editing) => !editing)}
                    >
                      <Pencil className="size-3.5" />
                      EDIT
                    </Button>
                  </span>
                </TooltipTrigger>
                {editDisabledReason ? <TooltipContent>{editDisabledReason}</TooltipContent> : null}
              </Tooltip>
            </>
          ) : null}
          {isLoading && onCancel ? (
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onCancel}>
              <Square className="size-3.5" />
              STOP
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            className="h-8 cursor-pointer text-xs"
            onClick={onExplain}
            disabled={isLoading}
          >
            <ChartNoAxesColumnIncreasing className="size-4" />
            EXPLAIN
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 cursor-pointer text-xs"
            onClick={onExplainAnalyze}
            disabled={isLoading}
          >
            <ChartNoAxesColumnIncreasing className="size-4" />
            EXPLAIN ANALYZE
          </Button>
          <Button
            size="sm"
            className="h-8 cursor-pointer text-xs"
            onClick={handleRun}
            disabled={isLoading}
          >
            <Play className="size-4" />
            RUN
          </Button>
        </div>
        {batchResults?.length || pinnedResults.length ? (
          <div className="flex gap-2 overflow-x-auto border-t px-2 py-2">
            {pinnedResults.length && !batchResults?.length ? (
              <Button
                variant={!activePinnedResult ? 'secondary' : 'ghost'}
                size="sm"
                className="shrink-0"
                onClick={() => onPinnedResultSelect(undefined)}
              >
                Current result
              </Button>
            ) : null}
            {batchResults?.map((result, index) => (
              <Button
                key={`${result.query}-${index}`}
                variant={
                  !activePinnedResult && index === safeActiveResultIndex ? 'secondary' : 'ghost'
                }
                size="sm"
                className="shrink-0 max-w-[180px] truncate"
                onClick={() => {
                  onPinnedResultSelect(undefined)
                  onResultSelect?.(index)
                }}
                title={result.query}
              >
                {getBatchResultIcon(result)}
                <span className="truncate">{getQueryTabLabel(result.query)}</span>
              </Button>
            ))}
            {pinnedResults.map((result) => (
              <Button
                key={result.id}
                variant={activePinnedResult?.id === result.id ? 'secondary' : 'ghost'}
                size="sm"
                className="shrink-0 max-w-[180px] truncate"
                onClick={() => onPinnedResultSelect(result.id)}
                title={`Pinned ${new Date(result.createdAt).toLocaleString()}: ${result.query}`}
              >
                <Pin className="size-3.5" />
                <span className="truncate">{result.name}</span>
              </Button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="flex flex-1 overflow-hidden">
        {isLoading && !activePinnedResult ? (
          <div className="flex w-full items-center justify-center text-center text-muted-foreground">
            <div>
              <p className="text-lg font-medium">Executing query...</p>
              <p className="text-sm">Please wait</p>
            </div>
          </div>
        ) : plan ? (
          <QueryPlanView plan={plan} />
        ) : displayedError ? (
          <div className="flex w-full items-center justify-center text-center text-destructive">
            <p>Error: {cleanErrorMessage(displayedError)}</p>
          </div>
        ) : displayedResult ? (
          displayedResult.columns.length ? (
            <div className="h-full w-full">
              {isEditing && editableTableData ? (
                <DataTable
                  columns={dataTableColumns}
                  data={editableTableData.rows}
                  onCellUpdate={handleCellUpdate}
                  rowSelection={rowSelection}
                  onRowSelectionChange={setRowSelection}
                  tabId={tabId}
                />
              ) : (
                <SimpleTable
                  columns={displayedResult.columns}
                  data={displayedResult.rows}
                  rowSelection={rowSelection}
                  onRowSelectionChange={setRowSelection}
                />
              )}
            </div>
          ) : (
            <div className="flex w-full items-center justify-center text-center text-muted-foreground">
              <p className="font-mono text-sm">{displayedResult.commandTag ?? 'OK'}</p>
            </div>
          )
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
