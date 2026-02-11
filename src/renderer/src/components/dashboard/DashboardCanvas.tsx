import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactGridLayout from 'react-grid-layout/legacy'
import type { Layout, LayoutItem } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent } from '@renderer/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@renderer/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'
import { cn, createId } from '@renderer/lib/utils'
import { useTheme } from '@renderer/hooks/use-theme'
import {
  Edit2,
  Eye,
  Plus,
  X,
  ZoomOut
} from 'lucide-react'
import type { DashboardConfig, Widget, WidgetType } from '@common/types'
import type { ChartZoomState, DashboardMode } from '@renderer/types/dashboard'
import { getAvailableWidgetTypes, getDefaultWidgetSettings, getDefaultWidgetSize, getWidgetComponent } from './widgets/registry'
import { WidgetEditDialog } from './widgets/WidgetEditDialog'
import {
  BarChartPlaceholder,
  KPIPlaceholder,
  LineChartPlaceholder,
  PieChartPlaceholder,
  ScatterChartPlaceholder,
  TablePlaceholder,
  SavedQueriesPlaceholder
} from './widgets/placeholders'
import { useWidgetData } from './widgets/useWidgetData'
import DotGrid from './dot-grid'

interface DashboardCanvasProps {
  dashboard: DashboardConfig
  connectionId: string
  onSave?: (config: DashboardConfig) => void
  onLayoutChange?: (widgets: Widget[]) => void
  onClose?: () => void
}

export function DashboardCanvas({
  dashboard,
  connectionId,
  onSave,
  onLayoutChange,
  onClose
}: DashboardCanvasProps) {
  const { theme } = useTheme()
  const [mode, setMode] = useState<DashboardMode>('view')
  const [widgets, setWidgets] = useState<Widget[]>(dashboard.widgets)
  const [containerWidth, setContainerWidth] = useState(1200)
  const containerRef = useRef<HTMLDivElement>(null)
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [expandedWidget, setExpandedWidget] = useState<Widget | null>(null)
  const [expandedZoomState, setExpandedZoomState] = useState<ChartZoomState | undefined>(undefined)

  // Use ref to access latest widgets in callbacks without causing re-renders
  const widgetsRef = useRef(widgets)
  widgetsRef.current = widgets

  // Track previous dashboard ID to detect dashboard switches
  const prevDashboardIdRef = useRef(dashboard.dashboardId)

  // Sync local widget state when dashboard or widgets change
  // Reset mode only when switching to a different dashboard
  useEffect(() => {
    const isDashboardSwitch = prevDashboardIdRef.current !== dashboard.dashboardId
    prevDashboardIdRef.current = dashboard.dashboardId

    setWidgets(dashboard.widgets)

    if (isDashboardSwitch) {
      setMode('view')
    }
  }, [dashboard.dashboardId, dashboard.widgets])

  // Measure container width for GridLayout
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setContainerWidth(entry.contentRect.width)
      }
    })

    observer.observe(container)
    setContainerWidth(container.clientWidth || 1200)

    return () => observer.disconnect()
  }, [])

  // Save dashboard with updated widgets
  const saveWidgets = useCallback(
    (updatedWidgets: Widget[]) => {
      onSave?.({
        ...dashboard,
        widgets: updatedWidgets,
        updatedAt: new Date()
      })
      onLayoutChange?.(updatedWidgets)
    },
    [dashboard, onSave, onLayoutChange]
  )

  // Convert widgets to react-grid-layout format
  const layout: Layout = useMemo(
    () =>
      widgets.map<LayoutItem>((widget) => ({
        i: widget.id,
        x: widget.position.x,
        y: widget.position.y,
        w: widget.position.w,
        h: widget.position.h,
        minW: widget.position.minW,
        minH: widget.position.minH,
        maxW: widget.position.maxW,
        maxH: widget.position.maxH,
        static: mode === 'view'
      })),
    [widgets, mode]
  )

  // Calculate content height based on widget positions
  const contentHeight = useMemo(() => {
    if (widgets.length === 0) return 0
    const rowHeight = dashboard.layout.rowHeight
    const [, marginY] = dashboard.layout.margin ?? [16, 16]
    const maxBottom = widgets.reduce((max, w) => Math.max(max, w.position.y + w.position.h), 0)
    // Calculate pixel height: (rows * rowHeight) + ((rows + 1) * marginY)
    return maxBottom * rowHeight + (maxBottom + 1) * marginY
  }, [widgets, dashboard.layout.rowHeight, dashboard.layout.margin])

  // Handle layout changes from drag/resize
  const handleLayoutChange = useCallback(
    (newLayout: Layout) => {
      const currentWidgets = widgetsRef.current
      const layoutMap = new Map(newLayout.map((l) => [l.i, l]))

      let hasChanges = false
      const updatedWidgets = currentWidgets.map((widget) => {
        const item = layoutMap.get(widget.id)
        if (!item) return widget

        const { x, y, w, h } = widget.position
        if (item.x === x && item.y === y && item.w === w && item.h === h) {
          return widget
        }

        hasChanges = true
        return {
          ...widget,
          position: { ...widget.position, x: item.x, y: item.y, w: item.w, h: item.h }
        }
      })

      if (hasChanges) {
        setWidgets(updatedWidgets)
        saveWidgets(updatedWidgets)
      }
    },
    [saveWidgets]
  )

  // Add a new widget
  const handleAddWidget = useCallback(
    (type: WidgetType) => {
      const defaultSize = getDefaultWidgetSize(type)
      const defaultSettings = getDefaultWidgetSettings(type)
      const currentWidgets = widgetsRef.current

      // Place new widget below existing ones
      const maxY = currentWidgets.reduce((max, w) => Math.max(max, w.position.y + w.position.h), 0)

      const newWidget: Widget = {
        id: createId('widget'),
        type,
        title: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Widget`,
        queryId: null,
        position: { x: 0, y: maxY, ...defaultSize },
        settings: defaultSettings
      }

      const updatedWidgets = [...currentWidgets, newWidget]
      setWidgets(updatedWidgets)
      saveWidgets(updatedWidgets)
    },
    [saveWidgets]
  )

  // Delete a widget
  const handleDeleteWidget = useCallback(
    (widgetId: string) => {
      const updatedWidgets = widgetsRef.current.filter((w) => w.id !== widgetId)
      setWidgets(updatedWidgets)
      saveWidgets(updatedWidgets)
    },
    [saveWidgets]
  )

  // Open edit dialog for a widget
  const handleEditWidget = useCallback((widget: Widget) => {
    setEditingWidget(widget)
    setEditDialogOpen(true)
  }, [])

  // Expand a widget to fullscreen
  const handleExpandWidget = useCallback((widget: Widget, zoomState?: ChartZoomState) => {
    setExpandedWidget(widget)
    setExpandedZoomState(zoomState)
  }, [])

  // Close expanded widget
  const handleCloseExpanded = useCallback(() => {
    setExpandedWidget(null)
    setExpandedZoomState(undefined)
  }, [])

  // Save widget changes from edit dialog
  const handleSaveWidget = useCallback(
    (updatedWidget: Widget) => {
      const updatedWidgets = widgetsRef.current.map((w) =>
        w.id === updatedWidget.id ? updatedWidget : w
      )
      setWidgets(updatedWidgets)
      saveWidgets(updatedWidgets)
    },
    [saveWidgets]
  )

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === 'view' ? 'edit' : 'view'))
  }, [])

  const isEditMode = mode === 'edit'
  const dotGridColors = useMemo(
    () =>
      theme === 'dark'
        ? { base: '#242424', active: '#7c7c7e' }
        : { base: '#E4E4E7', active: '#A1A1AA' },
    [theme]
  )

  return (
    <>
      <div className="h-full flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            {onClose && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
            <h2 className="text-lg font-semibold">{dashboard.name}</h2>
          </div>

          <div className="flex items-center gap-2">
            {isEditMode && <WidgetAddSheet onAdd={handleAddWidget} />}
            <Button variant={isEditMode ? 'default' : 'outline'} size="sm" onClick={toggleMode}>
              {isEditMode ? (
                <>
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </>
              ) : (
                <>
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit
                </>
              )}
            </Button>
          </div>
        </div>

      {/* Grid Canvas */}
      <div ref={containerRef} className="relative flex-1 overflow-auto p-4 pb-20!">
        {/* Background dot grid - extends to cover full scrollable content */}
        <div
          className="absolute inset-x-0 top-0 -z-10 pointer-events-none"
          style={{ minHeight: '100%', height: contentHeight > 0 ? contentHeight + 100 : '100%' }}
        >
          <DotGrid
            dotSize={5}
            gap={22}
            baseColor={dotGridColors.base}
            activeColor={dotGridColors.active}
            proximity={100}
            shockRadius={150}
            shockStrength={3}
            resistance={500}
            returnDuration={1}
            className="w-full h-full"
          />
        </div>
        {widgets.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <Card className="p-8 text-center">
              <p className="text-muted-foreground mb-4">
                {isEditMode
                  ? 'Add widgets to build your dashboard'
                  : 'This dashboard is empty'}
              </p>
              {isEditMode && (
                <WidgetAddSheet onAdd={handleAddWidget} />
              )}
            </Card>
          </div>
        ) : (
          <ReactGridLayout
            className="layout"
            layout={layout}
            width={containerWidth}
            cols={dashboard.layout.columns}
            rowHeight={dashboard.layout.rowHeight}
            margin={dashboard.layout.margin ?? [16, 16]}
            containerPadding={dashboard.layout.containerPadding ?? [0, 0]}
            compactType="vertical"
            preventCollision={false}
            isDraggable={isEditMode}
            isResizable={isEditMode}
            resizeHandles={['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']}
            draggableHandle=".widget-drag-handle"
            onDragStop={handleLayoutChange}
            onResizeStop={handleLayoutChange}
          >
            {widgets.map((widget) => (
              <div
                key={widget.id}
                className={cn(
                  'widget-container',
                  isEditMode && 'widget-drag-handle cursor-move'
                )}
              >
                <WidgetRenderer
                  widget={widget}
                  connectionId={connectionId}
                  isEditMode={isEditMode}
                  onEdit={handleEditWidget}
                  onDelete={handleDeleteWidget}
                  onExpand={handleExpandWidget}
                />
              </div>
            ))}
          </ReactGridLayout>
        )}
      </div>
    </div>

    {/* Widget Edit Dialog */}
    <WidgetEditDialog
      widget={editingWidget}
      connectionId={connectionId}
      open={editDialogOpen}
      onOpenChange={setEditDialogOpen}
      onSave={handleSaveWidget}
    />

    {/* Expanded Widget Sheet */}
    <Sheet open={!!expandedWidget} onOpenChange={(open) => !open && handleCloseExpanded()}>
      <SheetContent side="right" className="w-[75vw] sm:max-w-[75vw] p-0 flex flex-col">
        {expandedWidget && (
          <ExpandedWidgetSheet
            widget={expandedWidget}
            connectionId={connectionId}
            initialZoomState={expandedZoomState}
          />
        )}
      </SheetContent>
    </Sheet>
  </>
  )
}

// Widget renderer component - memoized to prevent unnecessary re-renders
interface WidgetRendererProps {
  widget: Widget
  connectionId: string
  isEditMode: boolean
  onEdit: (widget: Widget) => void
  onDelete: (widgetId: string) => void
  onExpand: (widget: Widget, zoomState?: ChartZoomState) => void
}

const WidgetRenderer = memo(function WidgetRenderer({
  widget,
  connectionId,
  isEditMode,
  onEdit,
  onDelete,
  onExpand
}: WidgetRendererProps) {
  const WidgetComponent = getWidgetComponent(widget.type)

  return (
    <div className="h-full">
      <WidgetComponent
        widget={widget}
        connectionId={connectionId}
        isEditMode={isEditMode}
        onEdit={onEdit}
        onDelete={onDelete}
        onExpand={onExpand}
      />
    </div>
  )
})

// Expanded widget sheet - renders widget with chart/table tabs
const ExpandedWidgetSheet = memo(function ExpandedWidgetSheet({
  widget,
  connectionId,
  initialZoomState
}: {
  widget: Widget
  connectionId: string
  initialZoomState?: ChartZoomState
}) {
  const WidgetComponent = getWidgetComponent(widget.type)
  const [zoomState, setZoomState] = useState<ChartZoomState | undefined>(initialZoomState)

  // Fetch data to calculate proper chart width - shares cache with WidgetComponent via query key
  const { data: queryData } = useWidgetData(widget, connectionId, { limit: 1000 })

  // Apply zoom filter to data if zoomed
  const filteredDataCount = useMemo(() => {
    if (!queryData?.rows?.length) return 0
    if (!zoomState) return queryData.rows.length

    // For index-based zoom (line/bar charts)
    if (zoomState.startIndex !== undefined && zoomState.endIndex !== undefined) {
      return zoomState.endIndex - zoomState.startIndex + 1
    }
    // For numeric zoom (scatter charts), we can't easily count without filtering
    return queryData.rows.length
  }, [queryData, zoomState])

  const dataPointCount = filteredDataCount

  // Calculate minimum width: at least 25px per data point, minimum 400px
  const minChartWidth = Math.max(400, dataPointCount * 25)

  const handleZoomReset = useCallback(() => {
    setZoomState(undefined)
  }, [])

  // For pie charts, compute distribution data
  const pieDistribution = useMemo(() => {
    if (widget.type !== 'pieChart' || !queryData?.rows?.length) return null

    const settings = widget.settings as { labelField?: string; xAxisField?: string }
    const field = settings.labelField ?? settings.xAxisField
    if (!field) return null

    // Count occurrences
    const counts = new Map<string, number>()
    for (const row of queryData.rows) {
      const record = row as Record<string, unknown>
      const value = String(record[field] ?? '')
      counts.set(value, (counts.get(value) ?? 0) + 1)
    }

    const total = queryData.rows.length
    return Array.from(counts.entries())
      .map(([label, count]) => ({
        label,
        count,
        percentage: ((count / total) * 100).toFixed(1)
      }))
      .sort((a, b) => b.count - a.count)
  }, [widget.type, widget.settings, queryData])

  // Extract the columns used in the chart for the table view
  const chartColumns = useMemo(() => {
    const settings = widget.settings as Record<string, unknown>
    const columns: string[] = []

    // Collect all field references from widget settings
    if (settings.xAxisField) columns.push(settings.xAxisField as string)
    if (settings.yAxisField) columns.push(settings.yAxisField as string)
    if (settings.labelField) columns.push(settings.labelField as string)
    if (settings.valueField) columns.push(settings.valueField as string)
    if (settings.colorField) columns.push(settings.colorField as string)
    if (settings.compareField) columns.push(settings.compareField as string)

    // Remove duplicates
    return [...new Set(columns)]
  }, [widget.settings])

  // Create a table widget with only the chart's columns
  const tableWidget: Widget = useMemo(
    () => ({
      ...widget,
      id: `${widget.id}-table-view`,
      type: 'table',
      title: widget.title,
      settings: {
        columns: chartColumns.length > 0 ? chartColumns : undefined,
        pageSize: 50
      }
    }),
    [widget, chartColumns]
  )

  // For table widgets, render directly without tabs
  if (widget.type === 'table') {
    return (
      <div className="h-full w-full flex flex-col">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle>{widget.title}</SheetTitle>
          <SheetDescription>Expanded table view</SheetDescription>
        </SheetHeader>
        <div className="flex-1 min-h-0 p-6">
          <WidgetComponent
            widget={widget}
            connectionId={connectionId}
            isEditMode={false}
            isExpanded={true}
          />
        </div>
      </div>
    )
  }

  // Check if this is a chart type that supports zooming
  const isZoomableChart = ['lineChart', 'barChart', 'scatterChart'].includes(widget.type)
  const isZoomed = !!zoomState

  return (
    <div className="h-full w-full flex flex-col">
      <SheetHeader className="px-6 py-4 border-b shrink-0">
        <div>
          <SheetTitle>{widget.title}</SheetTitle>
          <SheetDescription>
            {isZoomed ? 'Zoomed view - drag to select a new area or reset' : 'Expanded view with chart and data table'}
          </SheetDescription>
        </div>
      </SheetHeader>
      <Tabs defaultValue="chart" className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mx-6 mt-4">
          <TabsList className="w-fit">
            <TabsTrigger value="chart">Chart</TabsTrigger>
            <TabsTrigger value="table">Table</TabsTrigger>
          </TabsList>
          {isZoomableChart && isZoomed && (
            <Button variant="outline" size="sm" onClick={handleZoomReset}>
              <ZoomOut className="h-4 w-4 mr-1" />
              Reset Zoom
            </Button>
          )}
        </div>
        <TabsContent value="chart" className="flex-1 min-h-0 p-6">
          {/* Scrollable chart container for non-pie charts */}
          {widget.type === 'pieChart' ? (
            <div className="h-full w-full">
              <WidgetComponent
                widget={widget}
                connectionId={connectionId}
                isEditMode={false}
                isExpanded={true}
              />
            </div>
          ) : (
            <div className="h-full w-full overflow-x-auto">
              <div className="h-full" style={{ minWidth: minChartWidth }}>
                <WidgetComponent
                  widget={widget}
                  connectionId={connectionId}
                  isEditMode={false}
                  isExpanded={true}
                  zoomState={zoomState}
                  onZoomReset={handleZoomReset}
                />
              </div>
            </div>
          )}
        </TabsContent>
        <TabsContent value="table" className="flex-1 min-h-0 p-6 overflow-auto">
          {widget.type === 'pieChart' && pieDistribution ? (
            <div className="h-full w-full">
              <Card className="h-full">
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="text-left p-3 font-medium">Value</th>
                        <th className="text-right p-3 font-medium">Count</th>
                        <th className="text-right p-3 font-medium">Percentage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pieDistribution.map((row) => (
                        <tr key={row.label} className="border-t border-border/50 hover:bg-muted/30">
                          <td className="p-3">{row.label}</td>
                          <td className="text-right p-3 tabular-nums">{row.count.toLocaleString()}</td>
                          <td className="text-right p-3 tabular-nums text-muted-foreground">{row.percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="h-full w-full">
              {/* Render table widget for non-pie chart data view */}
              {(() => {
                const TableWidget = getWidgetComponent('table')
                return (
                  <TableWidget
                    widget={tableWidget}
                    connectionId={connectionId}
                    isEditMode={false}
                    isExpanded={true}
                  />
                )
              })()}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
})

// Widget descriptions for the sheet
const widgetDescriptions: Record<WidgetType, string> = {
  kpi: 'Display a single key metric with optional comparison',
  table: 'Show query results in a tabular format',
  barChart: 'Visualize categorical data with vertical bars',
  lineChart: 'Show trends over time or continuous data',
  pieChart: 'Display proportional data as segments',
  scatterChart: 'Plot relationships between two numeric variables',
  markdown: 'View and manage your saved queries'
}

// Sheet-based widget picker with previews
interface WidgetAddSheetProps {
  onAdd: (type: WidgetType) => void
}

// Compact placeholder previews for the widget picker - memoized
const WidgetPreview = memo(function WidgetPreview({ type }: { type: WidgetType }) {
  const previewSize = { width: 160, height: 80 }

  switch (type) {
    case 'kpi':
      return <KPIPlaceholder compact />
    case 'table':
      return <TablePlaceholder compact />
    case 'barChart':
      return <BarChartPlaceholder {...previewSize} />
    case 'lineChart':
      return <LineChartPlaceholder {...previewSize} />
    case 'pieChart':
      return <PieChartPlaceholder {...previewSize} />
    case 'scatterChart':
      return <ScatterChartPlaceholder {...previewSize} />
    case 'markdown':
      return <SavedQueriesPlaceholder compact />
    default:
      return null
  }
})

function WidgetAddSheet({ onAdd }: WidgetAddSheetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const widgetTypes = getAvailableWidgetTypes()

  const handleAdd = (type: WidgetType) => {
    onAdd(type)
    setIsOpen(false)
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Widget
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-150 sm:max-w-150">
        <SheetHeader className="pb-4 pt-8 px-8">
          <SheetTitle>Add Widget</SheetTitle>
          <SheetDescription>
            Choose a widget type to add to your dashboard
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 pt-2 px-10">
          {widgetTypes.map(({ type, label }) => (
            <button
              key={type}
              className="flex items-center cursor-pointer gap-4 p-4 rounded-xl border hover:bg-muted hover:border-accent-foreground/20 transition-colors text-left"
              onClick={() => handleAdd(type)}
            >
              <div className="shrink-0 rounded-lg bg-muted overflow-hidden w-40 h-20 flex items-center justify-center">
                <WidgetPreview type={type} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-base">{label}</div>
                <div className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {widgetDescriptions[type]}
                </div>
              </div>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
