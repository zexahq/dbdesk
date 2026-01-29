/**
 * Widget Edit Dialog
 * Dialog for configuring widget settings, query binding, and appearance
 */

import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
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
import type { Widget, WidgetType } from '../types'

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

  // Load saved queries for this connection
  const { data: savedQueries } = useQuery({
    queryKey: ['saved-queries', connectionId],
    queryFn: () => dbdeskClient.loadQueries(connectionId),
    enabled: open && !!connectionId
  })

  // Get columns from selected saved query (preview first row)
  const { data: savedQueryPreview } = useQuery({
    queryKey: ['query-preview', connectionId, queryId],
    queryFn: async () => {
      if (!queryId) return null
      const queries = await dbdeskClient.loadQueries(connectionId)
      const query = queries.find((q) => q.id === queryId)
      if (!query) return null
      const result = await dbdeskClient.runQuery(connectionId, query.content, { limit: 1 })
      return result
    },
    enabled: open && !!queryId && !!connectionId && queryMode === 'saved'
  })

  // Get columns from custom query (preview first row)
  const { data: customQueryPreview } = useQuery({
    queryKey: ['custom-query-preview', connectionId, customQuery],
    queryFn: async () => {
      if (!customQuery.trim()) return null
      const result = await dbdeskClient.runQuery(connectionId, customQuery, { limit: 1 })
      return result
    },
    enabled: open && !!customQuery.trim() && !!connectionId && queryMode === 'custom'
  })

  const columns =
    queryMode === 'saved' ? (savedQueryPreview?.columns ?? []) : (customQueryPreview?.columns ?? [])

  // Reset form when widget changes
  useEffect(() => {
    if (widget) {
      setTitle(widget.title)
      setQueryId(widget.queryId)
      setCustomQuery(widget.customQuery ?? '')
      setQueryMode(widget.customQuery ? 'custom' : 'saved')
      setSettings(widget.settings as Record<string, unknown>)
    }
  }, [widget])

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
    'focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-foreground/50'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto p-6">
        <DialogHeader className="space-y-2!">
          <DialogTitle>Edit Widget</DialogTitle>
          <DialogDescription>Configure your {widget.type} widget settings</DialogDescription>
        </DialogHeader>

        <div className="space-y-6! py-6">
          {/* General settings */}
          <div className="space-y-3!">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Widget title"
              className={inputFocusClass}
            />
          </div>

          <Separator />

          {/* Data binding */}
          <div className="space-y-3!">
            <Label>Query</Label>
            <Tabs value={queryMode} onValueChange={(v) => setQueryMode(v as 'saved' | 'custom')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="saved">Saved Query</TabsTrigger>
                <TabsTrigger value="custom">Custom SQL</TabsTrigger>
              </TabsList>
              <TabsContent value="saved" className="mt-3 space-y-3!">
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
                <p className="text-xs text-muted-foreground">
                  Select a saved query to bind data to this widget
                </p>
              </TabsContent>
              <TabsContent value="custom" className="mt-3 space-y-2!">
                <textarea
                  className={`w-full min-h-24 rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-foreground/50`}
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                  placeholder="SELECT * FROM table_name LIMIT 100"
                />
                <p className="text-xs text-muted-foreground">
                  Write a SQL query to fetch data for this widget
                </p>
                {customQueryPreview?.columns && customQueryPreview.columns.length > 0 && (
                  <p className="text-xs text-green-500">
                    ✓ Query valid - {customQueryPreview.columns.length} columns detected
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
            onUpdate={updateSetting}
            inputClassName={inputFocusClass}
          />
        </div>

        <DialogFooter className="pt-4">
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
  onUpdate: (key: string, value: unknown) => void
  inputClassName?: string
}

function WidgetTypeSettings({ type, settings, columns, onUpdate, inputClassName }: WidgetTypeSettingsProps) {
  switch (type) {
    case 'kpi':
      return <KPISettings settings={settings} columns={columns} onUpdate={onUpdate} inputClassName={inputClassName} />
    case 'table':
      return <TableSettings settings={settings} onUpdate={onUpdate} inputClassName={inputClassName} />
    case 'barChart':
    case 'lineChart':
    case 'scatterChart':
      return <ChartSettings settings={settings} columns={columns} onUpdate={onUpdate} inputClassName={inputClassName} />
    case 'pieChart':
      return <PieChartSettings settings={settings} columns={columns} onUpdate={onUpdate} inputClassName={inputClassName} />
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
    <div className="space-y-4!">
      <div className="space-y-2!">
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2!">
          <Label>Prefix</Label>
          <Input
            value={(settings.prefix as string) ?? ''}
            onChange={(e) => onUpdate('prefix', e.target.value)}
            placeholder="e.g. $"
            className={inputClassName}
          />
        </div>
        <div className="space-y-2!">
          <Label>Suffix</Label>
          <Input
            value={(settings.suffix as string) ?? ''}
            onChange={(e) => onUpdate('suffix', e.target.value)}
            placeholder="e.g. %"
            className={inputClassName}
          />
        </div>
      </div>

      <div className="space-y-2!">
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
    <div className="space-y-4!">
      <div className="space-y-2!">
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

// Chart Settings (Bar, Line, Scatter)
function ChartSettings({
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
    <div className="space-y-4!">
      <div className="space-y-2!">
        <Label>X Axis Field</Label>
        <Select
          value={(settings.xAxisField as string) ?? ''}
          onValueChange={(v) => onUpdate('xAxisField', v)}
        >
          <SelectTrigger className={inputClassName}>
            <SelectValue placeholder="Select X axis field" />
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

      <div className="space-y-2!">
        <Label>Y Axis Field</Label>
        <Select
          value={(settings.yAxisField as string) ?? ''}
          onValueChange={(v) => onUpdate('yAxisField', v)}
        >
          <SelectTrigger className={inputClassName}>
            <SelectValue placeholder="Select Y axis field" />
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

      <div className="flex items-center justify-between">
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
  inputClassName
}: {
  settings: Record<string, unknown>
  columns: string[]
  onUpdate: (key: string, value: unknown) => void
  inputClassName?: string
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Label Field</Label>
        <Select
          value={(settings.xAxisField as string) ?? ''}
          onValueChange={(v) => onUpdate('xAxisField', v)}
        >
          <SelectTrigger className={inputClassName}>
            <SelectValue placeholder="Select label field" />
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

      <div className="space-y-2">
        <Label>Value Field</Label>
        <Select
          value={(settings.yAxisField as string) ?? ''}
          onValueChange={(v) => onUpdate('yAxisField', v)}
        >
          <SelectTrigger className={inputClassName}>
            <SelectValue placeholder="Select value field" />
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

      <div className="flex items-center justify-between">
        <Label>Show Legend</Label>
        <Switch
          checked={(settings.showLegend as boolean) ?? true}
          onCheckedChange={(v) => onUpdate('showLegend', v)}
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
    <div className="space-y-4!">
      <div className="space-y-2!">
        <Label>Content</Label>
        <textarea
          className="w-full min-h-32 rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-foreground/50"
          value={(settings.content as string) ?? ''}
          onChange={(e) => onUpdate('content', e.target.value)}
          placeholder="Enter markdown content..."
        />
      </div>
    </div>
  )
}
