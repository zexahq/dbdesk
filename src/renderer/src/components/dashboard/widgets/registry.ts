/**
 * Widget Registry
 * Central registry for all available widget types
 * Enables extensible widget system through dynamic component resolution
 */

import type { WidgetRegistryEntry, WidgetType } from '../types'
import { KPIWidget } from './KPIWidget'
import { SavedQueriesWidget } from './SavedQueriesWidget'
import { TableWidget } from './TableWidget'
import { VisxBarChartWidget } from './charts/VisxBarChartWidget'
import { VisxLineChartWidget } from './charts/VisxLineChartWidget'
import { VisxPieChartWidget } from './charts/VisxPieChartWidget'
import { VisxScatterChartWidget } from './charts/VisxScatterChartWidget'

// Widget registry mapping types to components and metadata
export const WidgetRegistry: Record<WidgetType, WidgetRegistryEntry> = {
  kpi: {
    component: KPIWidget,
    defaultSettings: {
      valueField: '',
      formatType: 'number',
      decimals: 0
    },
    defaultSize: { w: 2, h: 2, minW: 1, minH: 1 },
    label: 'KPI Card',
    icon: 'hash'
  },
  table: {
    component: TableWidget,
    defaultSettings: {
      pageSize: 10,
      sortable: true,
      filterable: false
    },
    defaultSize: { w: 4, h: 4, minW: 2, minH: 2 },
    label: 'Data Table',
    icon: 'table'
  },
  barChart: {
    component: VisxBarChartWidget,
    defaultSettings: {
      xAxisField: '',
      yAxisField: '',
      showLegend: true,
      showGrid: true,
      colors: ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899']
    },
    defaultSize: { w: 4, h: 3, minW: 2, minH: 2 },
    label: 'Bar Chart',
    icon: 'bar-chart'
  },
  lineChart: {
    component: VisxLineChartWidget,
    defaultSettings: {
      xAxisField: '',
      yAxisField: '',
      showLegend: true,
      showGrid: true,
      colors: ['#3b82f6', '#06b6d4', '#10b981', '#84cc16', '#eab308']
    },
    defaultSize: { w: 4, h: 3, minW: 2, minH: 2 },
    label: 'Line Chart',
    icon: 'line-chart'
  },
  pieChart: {
    component: VisxPieChartWidget,
    defaultSettings: {
      xAxisField: '',
      yAxisField: '',
      showLegend: true,
      showGrid: false,
      colors: ['#f43f5e', '#f97316', '#facc15', '#4ade80', '#22d3ee', '#8b5cf6', '#ec4899']
    },
    defaultSize: { w: 3, h: 3, minW: 2, minH: 2 },
    label: 'Pie Chart',
    icon: 'pie-chart'
  },
  scatterChart: {
    component: VisxScatterChartWidget,
    defaultSettings: {
      xAxisField: '',
      yAxisField: '',
      showGrid: true,
      colors: ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899']
    },
    defaultSize: { w: 4, h: 3, minW: 2, minH: 2 },
    label: 'Scatter Chart',
    icon: 'scatter-chart'
  },
  markdown: {
    component: SavedQueriesWidget,
    defaultSettings: {
      content: ''
    },
    defaultSize: { w: 2, h: 3, minW: 2, minH: 2 },
    label: 'Saved Queries',
    icon: 'code'
  }
}

/**
 * Get a widget component by type
 */
export function getWidgetComponent(type: WidgetType) {
  const entry = WidgetRegistry[type]
  if (!entry) {
    throw new Error(`Unknown widget type: ${type}`)
  }
  return entry.component
}

/**
 * Get default settings for a widget type
 */
export function getDefaultWidgetSettings(type: WidgetType) {
  const entry = WidgetRegistry[type]
  if (!entry) {
    throw new Error(`Unknown widget type: ${type}`)
  }
  return { ...entry.defaultSettings }
}

/**
 * Get default size for a widget type
 */
export function getDefaultWidgetSize(type: WidgetType) {
  const entry = WidgetRegistry[type]
  if (!entry) {
    throw new Error(`Unknown widget type: ${type}`)
  }
  return { ...entry.defaultSize }
}

/**
 * Get all available widget types with their labels
 */
export function getAvailableWidgetTypes() {
  return Object.entries(WidgetRegistry).map(([type, entry]) => ({
    type: type as WidgetType,
    label: entry.label
  }))
}
