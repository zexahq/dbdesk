/**
 * Dashboard renderer-specific types
 * These types include React dependencies and are only used in the renderer process
 *
 * For shared types (used by both main and renderer), see @common/types/dashboard
 */

import type { Widget, WidgetPosition, WidgetSettings } from '@common/types'

// Zoom state for chart brush selection
export interface ChartZoomState {
  // For point-based x-axis (line chart, bar chart)
  startIndex?: number
  endIndex?: number
  // For numeric x-axis (scatter chart)
  xMin?: number
  xMax?: number
  yMin?: number
  yMax?: number
}

// Props passed to each widget component (renderer-specific)
export interface WidgetComponentProps<T extends WidgetSettings = WidgetSettings> {
  widget: Widget<T>
  connectionId: string
  isEditMode: boolean
  isExpanded?: boolean
  zoomState?: ChartZoomState
  onEdit?: (widget: Widget<T>) => void
  onDelete?: (widgetId: string) => void
  onRefresh?: () => void
  onExpand?: (widget: Widget<T>, zoomState?: ChartZoomState) => void
  onZoomReset?: () => void
}

// Dashboard mode (renderer-specific)
export type DashboardMode = 'view' | 'edit'

// Widget registry entry (renderer-specific)
export interface WidgetRegistryEntry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: React.ComponentType<WidgetComponentProps<any>>
  defaultSettings: WidgetSettings
  defaultSize: Pick<WidgetPosition, 'w' | 'h' | 'minW' | 'minH'>
  label: string
  icon?: string
}
