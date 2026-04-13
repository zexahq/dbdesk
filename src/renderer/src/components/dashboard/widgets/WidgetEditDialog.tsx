/**
 * Widget Edit Dialog
 * Dialog for configuring widget settings, query binding, and appearance
 */

import { useQuery, useMutation } from '@tanstack/react-query'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { dbdeskClient } from '@renderer/api/client'
import { Button } from '@renderer/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { Switch } from '@renderer/components/ui/switch'
import { Separator } from '@renderer/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'
import type { Widget, WidgetType } from '@common/types'

interface WidgetEditDialogProps {
  widget: Widget | null
  connectionId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (widget: Widget) => void
}

export function WidgetEditDialog({
  widget,
  connectionId,
  open,
  onOpenChange,
  onSave
}: WidgetEditDialogProps) {
  const [title, setTitle] = useState('')
  const [queryId, setQueryId] = useState<string | null>(null)
  const [customQuery, setCustomQuery] = useState('')
  const [queryMode, setQueryMode] = useState<'saved' | 'custom'>('saved')
  const [settings, setSettings] = useState<Record<string, unknown>>({})
  const [validatedQuery, setValidatedQuery] = useState<string | null>(null)
  const [validatedColumns, setValidatedColumns] = useState<string[]>([])
  const [validatedPreviewRow, setValidatedPreviewRow] = useState<Record<string, unknown> | null>(null)
  // Track the original custom query to detect changes
  const [originalCustomQuery, setOriginalCustomQuery] = useState<string | null>(null)

  // Load saved queries for this connection
  const { data: savedQueries } = useQuery({
    queryKey: ['saved-queries', connectionId],
    queryFn: () => dbdeskClient.loadQueries(connectionId),
    enabled: open && !!connectionId,
    staleTime: 60_000, // 1 minute cache
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false
  })

  const selectedSavedQuery = useMemo(
    () => savedQueries?.find((q) => q.id === queryId),
    [savedQueries, queryId]
  )

  // Get columns from selected saved query (preview first row)
  const { data: savedQueryPreview } = useQuery({
    queryKey: ['query-preview', connectionId, selectedSavedQuery?.id],
    queryFn: async () => {
      if (!selectedSavedQuery) return null
      return dbdeskClient.runQuery(connectionId, selectedSavedQuery.content, { limit: 1 })
    },
    enabled: open && !!connectionId && queryMode === 'saved' && !!selectedSavedQuery,
    staleTime: 30_000,
    refetchOnWindowFocus: false
  })

  // Mutation for validating custom queries
  const validateMutation = useMutation({
    mutationFn: async (query: string) => {
      const result = await dbdeskClient.runQuery(connectionId, query, { limit: 1 })
      return { query, columns: result.columns, previewRow: result.rows[0] as Record<string, unknown> | undefined }
    },
    onSuccess: (data) => {
      setValidatedQuery(data.query)
      setValidatedColumns(data.columns)
      setValidatedPreviewRow(data.previewRow ?? null)
    }
  })

  // Handle validate button click
  const handleValidateQuery = useCallback(() => {
    if (customQuery.trim()) {
      validateMutation.mutate(customQuery.trim())
    }
  }, [customQuery, validateMutation.mutate])

  // Determine validation state
  const trimmedCustomQuery = customQuery.trim()
  const isQueryValidated = validatedQuery === trimmedCustomQuery && validatedColumns.length > 0
  // Query has been modified from what was originally saved
  const isQueryModified = originalCustomQuery !== null && originalCustomQuery !== trimmedCustomQuery
  // Show validation required only if query was modified and not re-validated
  const needsRevalidation = queryMode === 'custom' && isQueryModified && !isQueryValidated

  // Get columns based on mode
  const columns = useMemo(() => {
    if (queryMode === 'saved') {
      return savedQueryPreview?.columns ?? []
    }
    // Return validated columns if available
    return validatedColumns
  }, [queryMode, savedQueryPreview?.columns, validatedColumns])

  // Get preview row for type inference
  const previewRow = useMemo(() => {
    if (queryMode === 'saved') {
      return savedQueryPreview?.rows?.[0] as Record<string, unknown> | undefined
    }
    return validatedPreviewRow ?? undefined
  }, [queryMode, savedQueryPreview?.rows, validatedPreviewRow])

  // Get numeric columns (for scatter charts that require numeric X/Y)
  const numericColumns = useMemo(() => {
    if (!previewRow) return columns
    return columns.filter((col) => {
      const value = previewRow[col]
      if (typeof value === 'number') return true
      if (typeof value === 'string') {
        const parsed = parseFloat(value)
        return !isNaN(parsed)
      }
      return false
    })
  }, [columns, previewRow])

  // Reset form when widget changes
  useEffect(() => {
    if (!widget) return

    setTitle(widget.title)
    setQueryId(widget.queryId)
    const widgetCustomQuery = widget.customQuery ?? ''
    setCustomQuery(widgetCustomQuery)
    setQueryMode(widget.customQuery ? 'custom' : 'saved')
    setSettings(widget.settings as Record<string, unknown>)
    // Track original query and reset validation state
    setOriginalCustomQuery(widget.customQuery ?? null)
    setValidatedQuery(null)
    setValidatedColumns([])
    setValidatedPreviewRow(null)
    validateMutation.reset()
  }, [widget?.id])

  // Auto-validate existing custom query when dialog opens
  useEffect(() => {
    if (open && widget?.customQuery?.trim() && connectionId) {
      validateMutation.mutate(widget.customQuery.trim())
    }
  }, [open, widget?.id, connectionId])

  const handleSave = () => {
    if (!widget) return
    onSave({
      ...widget,
      title,
      queryId: queryMode === 'saved' ? queryId : null,
      customQuery: queryMode === 'custom' ? customQuery : undefined,
      settings
    })
    onOpenChange(false)
  }

  const updateSetting = (key: string, value: unknown) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  if (!widget) return null

  // Custom input class to remove blue ring and use white border on focus
  const inputFocusClass =
    'my-1.5 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-foreground/50'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto p-6 gap-8">
        <DialogHeader className="space-y-3">
          <DialogTitle>Edit Widget</DialogTitle>
          <DialogDescription>Configure your {widget.type} widget settings</DialogDescription>
        </DialogHeader>

        <div className="py-3 flex flex-col gap-4">
          {/* General settings */}
          <div className="space-y-3">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Widget title"
              className={inputFocusClass + " mt-2"}
            />
          </div>

          <Separator />

          {/* Data binding */}
          <div className="space-y-3">
            <Label>Query</Label>
            <Tabs
              value={queryMode}
              onValueChange={(v) => setQueryMode(v as 'saved' | 'custom')}
              className="gap-4 mt-2"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="saved">Saved Query</TabsTrigger>
                <TabsTrigger value="custom">Custom SQL</TabsTrigger>
              </TabsList>
              <TabsContent value="saved" className="mt-5 space-y-5">
                <Select value={queryId ?? ''} onValueChange={(v) => setQueryId(v || null)}>
                  <SelectTrigger className={`w-full ${inputFocusClass}`}>
                    <SelectValue placeholder="Select a saved query" />
                  </SelectTrigger>
                  <SelectContent>
                    {savedQueries?.map((q) => (
                      <SelectItem key={q.id} value={q.id}>
                        {q.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {queryId && savedQueries?.find((q) => q.id === queryId) && (
                  <div className="rounded-md border border-input bg-muted/30 p-3">
                    <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all">
                      {savedQueries.find((q) => q.id === queryId)?.content}
                    </pre>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Select a saved query to bind data to this widget
                </p>
              </TabsContent>
              <TabsContent value="custom" className="mt-5 space-y-5">
                <textarea
                  className={`my-1.5 w-full min-h-24 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-foreground/50`}
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                  placeholder="SELECT * FROM table_name LIMIT 100"
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Write a SQL query to fetch data for this widget
                  </p>
                  <Button
                    type="button"
                    variant={isQueryValidated ? 'outline' : 'secondary'}
                    size="sm"
                    onClick={handleValidateQuery}
                    disabled={!customQuery.trim() || validateMutation.isPending}
                  >
                    {validateMutation.isPending ? (
                      'Validating...'
                    ) : isQueryValidated ? (
                      '✓ Valid'
                    ) : (
                      'Validate Query'
                    )}
                  </Button>
                </div>
                {validateMutation.isError && (
                  <p className="text-xs text-destructive">
                    ✗ {validateMutation.error instanceof Error ? validateMutation.error.message : 'Query validation failed'}
                  </p>
                )}
                {isQueryValidated && (
                  <p className="text-xs text-green-500">
                    ✓ Query valid - {validatedColumns.length} columns detected
                  </p>
                )}
                {needsRevalidation && (
                  <p className="text-xs text-amber-500">
                    Query modified - click Validate to check
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <Separator />

          {/* Widget-specific settings */}
          <WidgetTypeSettings
            type={widget.type}
            settings={settings}
            columns={columns}
            numericColumns={numericColumns}
            onUpdate={updateSetting}
            inputClassName={inputFocusClass}
            disabled={needsRevalidation}
          />
        </div>

        <DialogFooter className="pt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Widget-specific settings based on type
interface WidgetTypeSettingsProps {
  type: WidgetType
  settings: Record<string, unknown>
  columns: string[]
  numericColumns: string[]
  onUpdate: (key: string, value: unknown) => void
  inputClassName?: string
  disabled?: boolean
}

function WidgetTypeSettings({ type, settings, columns, numericColumns, onUpdate, inputClassName, disabled }: WidgetTypeSettingsProps) {
  switch (type) {
    case 'kpi':
      return <KPISettings settings={settings} columns={columns} onUpdate={onUpdate} inputClassName={inputClassName} />
    case 'table':
      return <TableSettings settings={settings} onUpdate={onUpdate} inputClassName={inputClassName} />
    case 'barChart':
      return <BarChartSettings settings={settings} columns={columns} onUpdate={onUpdate} inputClassName={inputClassName} disabled={disabled} />
    case 'lineChart':
      return <ChartSettings settings={settings} columns={columns} onUpdate={onUpdate} inputClassName={inputClassName} disabled={disabled} />
    case 'scatterChart':
      return <ScatterChartSettings settings={settings} numericColumns={numericColumns} onUpdate={onUpdate} inputClassName={inputClassName} disabled={disabled} />
    case 'pieChart':
      return <PieChartSettings settings={settings} columns={columns} onUpdate={onUpdate} inputClassName={inputClassName} disabled={disabled} />
    case 'markdown':
      return <MarkdownSettings settings={settings} onUpdate={onUpdate} />
    default:
      return null
  }
}

// KPI Settings
function KPISettings({
  settings,
  columns,
  onUpdate,
  inputClassName
}: {
  settings: Record<string, unknown>
  columns: string[]
  onUpdate: (key: string, value: unknown) => void
  inputClassName?: string
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>Value Field</Label>
        <Select
          value={(settings.valueField as string) ?? ''}
          onValueChange={(v) => onUpdate('valueField', v)}
        >
          <SelectTrigger className={inputClassName}>
            <SelectValue placeholder="Select field for value" />
          </SelectTrigger>
          <SelectContent>
            {columns.map((col) => (
              <SelectItem key={col} value={col}>
                {col}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-5">
        <div className="space-y-3">
          <Label>Prefix</Label>
          <Input
            value={(settings.prefix as string) ?? ''}
            onChange={(e) => onUpdate('prefix', e.target.value)}
            placeholder="e.g. $"
            className={inputClassName}
          />
        </div>
        <div className="space-y-3">
          <Label>Suffix</Label>
          <Input
            value={(settings.suffix as string) ?? ''}
            onChange={(e) => onUpdate('suffix', e.target.value)}
            placeholder="e.g. %"
            className={inputClassName}
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label>Format</Label>
        <Select
          value={(settings.formatType as string) ?? 'number'}
          onValueChange={(v) => onUpdate('formatType', v)}
        >
          <SelectTrigger className={inputClassName}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="number">Number</SelectItem>
            <SelectItem value="currency">Currency</SelectItem>
            <SelectItem value="percentage">Percentage</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

// Table Settings
function TableSettings({
  settings,
  onUpdate,
  inputClassName
}: {
  settings: Record<string, unknown>
  onUpdate: (key: string, value: unknown) => void
  inputClassName?: string
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>Page Size</Label>
        <Select
          value={String((settings.pageSize as number) ?? 10)}
          onValueChange={(v) => onUpdate('pageSize', parseInt(v))}
        >
          <SelectTrigger className={inputClassName}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5 rows</SelectItem>
            <SelectItem value="10">10 rows</SelectItem>
            <SelectItem value="25">25 rows</SelectItem>
            <SelectItem value="50">50 rows</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

// Chart Settings (Line, Bar via composition)
// Accepts optional children to insert between axis selectors and grid toggle
function ChartSettings({
  settings,
  columns,
  onUpdate,
  inputClassName,
  disabled,
  children
}: {
  settings: Record<string, unknown>
  columns: string[]
  onUpdate: (key: string, value: unknown) => void
  inputClassName?: string
  disabled?: boolean
  children?: React.ReactNode
}) {
  const isDisabled = disabled || columns.length === 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 mb-3">
        <div className="space-y-3 flex-1">
          <Label>X Axis Field</Label>
          <Select
            value={(settings.xAxisField as string) ?? ''}
            onValueChange={(v) => onUpdate('xAxisField', v)}
            disabled={isDisabled}
          >
            <SelectTrigger className={`w-full ${inputClassName}`}>
              <SelectValue placeholder="Select X axis" />
            </SelectTrigger>
            <SelectContent>
              {columns.map((col) => (
                <SelectItem key={col} value={col}>
                  {col}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3 flex-1">
          <Label>Y Axis Field</Label>
          <Select
            value={(settings.yAxisField as string) ?? ''}
            onValueChange={(v) => onUpdate('yAxisField', v)}
            disabled={isDisabled}
          >
            <SelectTrigger className={`w-full ${inputClassName}`}>
              <SelectValue placeholder="Select Y axis" />
            </SelectTrigger>
            <SelectContent>
              {columns.map((col) => (
                <SelectItem key={col} value={col}>
                  {col}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {isDisabled && columns.length === 0 && (
        <p className="text-xs text-muted-foreground" style={{marginBlock: "0.75rem"}}>
          Validate your query to select axis fields
        </p>
      )}

      {children}

      <div className="flex items-center justify-between mt-2">
        <Label className='text-xs'>Show Grid</Label>
        <Switch
          checked={(settings.showGrid as boolean) ?? true}
          onCheckedChange={(v) => onUpdate('showGrid', v)}
        />
      </div>
    </div>
  )
}

// Bar Chart Settings — composes ChartSettings, adds orientation
function BarChartSettings({
  settings,
  columns,
  onUpdate,
  inputClassName,
  disabled
}: {
  settings: Record<string, unknown>
  columns: string[]
  onUpdate: (key: string, value: unknown) => void
  inputClassName?: string
  disabled?: boolean
}) {
  return (
    <ChartSettings
      settings={settings}
      columns={columns}
      onUpdate={onUpdate}
      inputClassName={inputClassName}
      disabled={disabled}
    >
      <div className="space-y-3">
        <Label>Orientation</Label>
        <Select
          value={(settings.orientation as string) ?? 'vertical'}
          onValueChange={(v) => onUpdate('orientation', v)}
        >
          <SelectTrigger className={`w-full ${inputClassName}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="vertical">Vertical bars</SelectItem>
            <SelectItem value="horizontal">Horizontal bars</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </ChartSettings>
  )
}

// Scatter Chart Settings (numeric columns only)
function ScatterChartSettings({
  settings,
  numericColumns,
  onUpdate,
  inputClassName,
  disabled
}: {
  settings: Record<string, unknown>
  numericColumns: string[]
  onUpdate: (key: string, value: unknown) => void
  inputClassName?: string
  disabled?: boolean
}) {
  const isDisabled = disabled || numericColumns.length === 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 mb-3">
        <div className="space-y-3 flex-1">
          <Label>X Axis Field</Label>
          <Select
            value={(settings.xAxisField as string) ?? ''}
            onValueChange={(v) => onUpdate('xAxisField', v)}
            disabled={isDisabled}
          >
            <SelectTrigger className={`w-full ${inputClassName}`}>
              <SelectValue placeholder="Select X axis" />
            </SelectTrigger>
            <SelectContent>
              {numericColumns.map((col) => (
                <SelectItem key={col} value={col}>
                  {col}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3 flex-1">
          <Label>Y Axis Field</Label>
          <Select
            value={(settings.yAxisField as string) ?? ''}
            onValueChange={(v) => onUpdate('yAxisField', v)}
            disabled={isDisabled}
          >
            <SelectTrigger className={`w-full ${inputClassName}`}>
              <SelectValue placeholder="Select Y axis" />
            </SelectTrigger>
            <SelectContent>
              {numericColumns.map((col) => (
                <SelectItem key={col} value={col}>
                  {col}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {numericColumns.length === 0 && (
        <p className="text-xs text-amber-500">
          No numeric columns found. Scatter charts require numeric X and Y values.
        </p>
      )}
      {!isDisabled && (
        <p className="text-xs text-muted-foreground">
          Only numeric columns are shown for scatter charts
        </p>
      )}

      <div className="flex items-center justify-between pt-1">
        <Label>Show Grid</Label>
        <Switch
          checked={(settings.showGrid as boolean) ?? true}
          onCheckedChange={(v) => onUpdate('showGrid', v)}
        />
      </div>
    </div>
  )
}

// Pie Chart Settings
function PieChartSettings({
  settings,
  columns,
  onUpdate,
  inputClassName,
  disabled
}: {
  settings: Record<string, unknown>
  columns: string[]
  onUpdate: (key: string, value: unknown) => void
  inputClassName?: string
  disabled?: boolean
}) {
  const isDisabled = disabled || columns.length === 0

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>Field</Label>
        <Select
          value={(settings.labelField as string) ?? (settings.xAxisField as string) ?? ''}
          onValueChange={(v) => onUpdate('labelField', v)}
          disabled={isDisabled}
        >
          <SelectTrigger className={`w-full ${inputClassName}`}>
            <SelectValue placeholder="Select field" />
          </SelectTrigger>
          <SelectContent>
            {columns.map((col) => (
              <SelectItem key={col} value={col}>
                {col}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Shows distribution - counts occurrences of each unique value
        </p>
      </div>
      {isDisabled && columns.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Validate your query to select a field
        </p>
      )}

      <div className="flex items-center justify-between pt-1 mt-3">
        <Label>Show Legend</Label>
        <Switch
          checked={(settings.showLegend as boolean) ?? true}
          onCheckedChange={(v) => onUpdate('showLegend', v)}
        />
      </div>

      <div className="flex items-center justify-between pt-1 mt-3">
        <Label>Show Data Table</Label>
        <Switch
          checked={(settings.showTable as boolean) ?? true}
          onCheckedChange={(v) => onUpdate('showTable', v)}
        />
      </div>
    </div>
  )
}

// Markdown Settings
function MarkdownSettings({
  settings,
  onUpdate
}: {
  settings: Record<string, unknown>
  onUpdate: (key: string, value: unknown) => void
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>Content</Label>
        <textarea
          className="w-full min-h-32 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-foreground/50"
          value={(settings.content as string) ?? ''}
          onChange={(e) => onUpdate('content', e.target.value)}
          placeholder="Enter markdown content..."
        />
      </div>
    </div>
  )
}
