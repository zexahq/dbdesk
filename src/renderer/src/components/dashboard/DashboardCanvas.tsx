/**
 * Dashboard Canvas Component
 * Main container for the dashboard grid layout with drag/resize/drop support
 * Uses react-grid-layout for widget positioning and sizing
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GridLayout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { Button } from '@renderer/components/ui/button'
import { Card } from '@renderer/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@renderer/components/ui/sheet'
import { cn } from '@renderer/lib/utils'
import {
  Edit2,
  Eye,
  Plus,
  X
} from 'lucide-react'
import type { DashboardConfig, DashboardMode, Widget, WidgetType } from './types'
import {
  getAvailableWidgetTypes,
  getDefaultWidgetSettings,
  getDefaultWidgetSize,
  getWidgetComponent
} from './widgets/registry'
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

// react-grid-layout types
type LayoutItem = {
  i: string
  x: number
  y: number
  w: number
  h: number
  minW?: number
  minH?: number
  maxW?: number
  maxH?: number
  static?: boolean
}

// Width will be measured from container ref

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
  const [mode, setMode] = useState<DashboardMode>('view')
  const [widgets, setWidgets] = useState<Widget[]>(dashboard.widgets)
  const [containerWidth, setContainerWidth] = useState(1200)
  const containerRef = useRef<HTMLDivElement>(null)
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  // Helper to save dashboard with updated widgets
  const saveWithWidgets = useCallback(
    (updatedWidgets: Widget[]) => {
      const updatedConfig: DashboardConfig = {
        ...dashboard,
        widgets: updatedWidgets,
        updatedAt: new Date()
      }
      onSave?.(updatedConfig)
    },
    [dashboard, onSave]
  )

  // Measure container width for GridLayout
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })

    resizeObserver.observe(container)
    // Set initial width
    setContainerWidth(container.clientWidth || 1200)

    return () => resizeObserver.disconnect()
  }, [])

  // Convert widgets to react-grid-layout format
  const layout: LayoutItem[] = useMemo(
    () =>
      widgets.map((widget) => ({
        i: widget.id,
        x: widget.position.x,
        y: widget.position.y,
        w: widget.position.w,
        h: widget.position.h,
        minW: widget.position.minW,
        minH: widget.position.minH,
        maxW: widget.position.maxW,
        maxH: widget.position.maxH,
        static: mode === 'view' // Lock widgets in view mode
      })),
    [widgets, mode]
  )

  // Handle layout changes from drag/resize
  const handleLayoutChange = useCallback(
    (newLayout: readonly LayoutItem[]) => {
      const updatedWidgets = widgets.map((widget) => {
        const layoutItem = newLayout.find((l) => l.i === widget.id)
        if (!layoutItem) return widget

        return {
          ...widget,
          position: {
            ...widget.position,
            x: layoutItem.x,
            y: layoutItem.y,
            w: layoutItem.w,
            h: layoutItem.h
          }
        }
      })

      setWidgets(updatedWidgets)
      saveWithWidgets(updatedWidgets)
      onLayoutChange?.(updatedWidgets)
    },
    [widgets, onLayoutChange, saveWithWidgets]
  )

  // Generate unique widget ID
  const generateWidgetId = () => `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  // Add a new widget
  const handleAddWidget = (type: WidgetType) => {
    const defaultSize = getDefaultWidgetSize(type)
    const defaultSettings = getDefaultWidgetSettings(type)

    // Find a free position
    const maxY = widgets.reduce((max, w) => Math.max(max, w.position.y + w.position.h), 0)

    const newWidget: Widget = {
      id: generateWidgetId(),
      type,
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Widget`,
      queryId: null,
      position: {
        x: 0,
        y: maxY,
        ...defaultSize
      },
      settings: defaultSettings
    }

    const updatedWidgets = [...widgets, newWidget]
    setWidgets(updatedWidgets)
    saveWithWidgets(updatedWidgets)
  }

  // Delete a widget
  const handleDeleteWidget = useCallback((widgetId: string) => {
    const updatedWidgets = widgets.filter((w) => w.id !== widgetId)
    setWidgets(updatedWidgets)
    saveWithWidgets(updatedWidgets)
  }, [widgets, saveWithWidgets])

  // Edit a widget - open the edit dialog
  const handleEditWidget = useCallback((widget: Widget) => {
    setEditingWidget(widget)
    setEditDialogOpen(true)
  }, [])

  // Save widget changes from dialog
  const handleSaveWidget = useCallback((updatedWidget: Widget) => {
    const updatedWidgets = widgets.map((w) =>
      w.id === updatedWidget.id ? updatedWidget : w
    )
    setWidgets(updatedWidgets)
    saveWithWidgets(updatedWidgets)
  }, [widgets, saveWithWidgets])

  // Toggle between edit and view modes
  const toggleMode = () => {
    setMode((prev) => (prev === 'view' ? 'edit' : 'view'))
  }

  const isEditMode = mode === 'edit'

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
          {isEditMode && (
            <WidgetAddSheet onAdd={handleAddWidget} />
          )}
          <Button
            variant={isEditMode ? 'default' : 'outline'}
            size="sm"
            onClick={toggleMode}
          >
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
      <div ref={containerRef} className="flex-1 overflow-auto p-4">
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
          <GridLayout
            className="layout"
            layout={layout}
            width={containerWidth}
            gridConfig={{
              cols: dashboard.layout.columns,
              rowHeight: dashboard.layout.rowHeight,
              margin: dashboard.layout.margin ?? [16, 16],
              containerPadding: dashboard.layout.containerPadding ?? [0, 0],
              maxRows: Infinity
            }}
            dragConfig={{
              enabled: isEditMode,
              handle: '.widget-drag-handle'
            }}
            resizeConfig={{
              enabled: isEditMode
            }}
            onLayoutChange={handleLayoutChange}
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
                />
              </div>
            ))}
          </GridLayout>
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
  </>
  )
}

// Widget renderer component
interface WidgetRendererProps {
  widget: Widget
  connectionId: string
  isEditMode: boolean
  onEdit: (widget: Widget) => void
  onDelete: (widgetId: string) => void
}

function WidgetRenderer({
  widget,
  connectionId,
  isEditMode,
  onEdit,
  onDelete
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
      />
    </div>
  )
}

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

// Compact placeholder previews for the widget picker
function WidgetPreview({ type }: { type: WidgetType }) {
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
}

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
              className="flex items-center cursor-pointer gap-4 p-4 rounded-xl border hover:bg-neutral-900 hover:border-accent-foreground/20 transition-colors text-left"
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
