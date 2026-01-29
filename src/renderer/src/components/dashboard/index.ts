/**
 * Dashboard Module Exports
 * Central export point for all dashboard-related components and utilities
 */

// Main components
export { DashboardCanvas } from './DashboardCanvas'

// Types
export type {
  ChartWidgetSettings,
  DashboardConfig,
  DashboardLayout,
  DashboardMode,
  KPIWidgetSettings,
  MarkdownWidgetSettings,
  ScatterWidgetSettings,
  TableWidgetSettings,
  Widget,
  WidgetComponentProps,
  WidgetPosition,
  WidgetQueryData,
  WidgetRegistryEntry,
  WidgetSettings,
  WidgetType
} from './types'

// Widget registry utilities
export {
  getAvailableWidgetTypes,
  getDefaultWidgetSettings,
  getDefaultWidgetSize,
  getWidgetComponent,
  WidgetRegistry
} from './widgets/registry'

// Individual widgets (for direct use if needed)
export { KPIWidget } from './widgets/KPIWidget'
export { TableWidget } from './widgets/TableWidget'
export { VisxBarChartWidget } from './widgets/charts/VisxBarChartWidget'
export { VisxLineChartWidget } from './widgets/charts/VisxLineChartWidget'
export { VisxPieChartWidget } from './widgets/charts/VisxPieChartWidget'
export { VisxScatterChartWidget } from './widgets/charts/VisxScatterChartWidget'
