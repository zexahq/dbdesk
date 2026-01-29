/**
 * Dashboard configuration types
 * Re-exports shared types from common and adds renderer-specific types
 */

// Re-export all shared dashboard types from common
export type {
  ChartWidgetSettings,
  DashboardConfig,
  DashboardLayout,
  KPIWidgetSettings,
  MarkdownWidgetSettings,
  ScatterWidgetSettings,
  TableWidgetSettings,
  Widget,
  WidgetPosition,
  WidgetSettings,
  WidgetType
} from '@common/types'

// Import types for use in this file
import type { Widget, WidgetPosition, WidgetSettings } from '@common/types'

// Props passed to each widget component (renderer-specific)
export interface WidgetComponentProps<T extends WidgetSettings = WidgetSettings> {
  widget: Widget<T>
  connectionId: string
  isEditMode: boolean
  onEdit?: (widget: Widget<T>) => void
  onDelete?: (widgetId: string) => void
  onRefresh?: () => void
}

// Query result data for widgets (renderer-specific)
export interface WidgetQueryData {
  rows: Record<string, unknown>[]
  columns: string[]
  rowCount: number
  isLoading: boolean
  error: string | null
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
