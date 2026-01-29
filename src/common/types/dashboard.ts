/**
 * Dashboard types for persistence
 * These types are used for storing dashboards locally and in cloud storage
 */

// Widget type enum for type safety
export type WidgetType =
  | 'kpi'
  | 'table'
  | 'barChart'
  | 'lineChart'
  | 'pieChart'
  | 'scatterChart'
  | 'markdown'

// Base position/sizing for react-grid-layout
export interface WidgetPosition {
  x: number
  y: number
  w: number
  h: number
  minW?: number
  minH?: number
  maxW?: number
  maxH?: number
}

// KPI widget specific settings
export interface KPIWidgetSettings {
  valueField: string
  labelField?: string
  prefix?: string
  suffix?: string
  formatType?: 'number' | 'currency' | 'percentage'
  decimals?: number
  compareField?: string
  compareLabel?: string
}

// Table widget specific settings
export interface TableWidgetSettings {
  columns?: string[]
  pageSize?: number
  sortable?: boolean
  filterable?: boolean
}

// Chart widget specific settings
export interface ChartWidgetSettings {
  xAxisField: string
  yAxisField: string
  colorField?: string
  showLegend?: boolean
  showGrid?: boolean
  colors?: string[]
}

// Markdown/Saved Queries widget specific settings
export interface MarkdownWidgetSettings {
  content: string
}

// Scatter chart specific settings
export interface ScatterWidgetSettings {
  xAxisField: string
  yAxisField: string
  labelField?: string
  showGrid?: boolean
  colors?: string[]
}

// Union type for all widget settings
export type WidgetSettings =
  | KPIWidgetSettings
  | TableWidgetSettings
  | ChartWidgetSettings
  | ScatterWidgetSettings
  | MarkdownWidgetSettings

// Base widget interface
export interface Widget<T extends WidgetSettings = WidgetSettings> {
  id: string
  type: WidgetType
  title: string
  queryId: string | null
  customQuery?: string
  position: WidgetPosition
  settings: T
}

// Dashboard layout configuration
export interface DashboardLayout {
  columns: number
  rowHeight: number
  margin?: [number, number]
  containerPadding?: [number, number]
}

// Complete dashboard configuration
export interface DashboardConfig {
  dashboardId: string
  connectionId: string
  name: string
  description?: string
  layout: DashboardLayout
  widgets: Widget[]
  createdAt: Date
  updatedAt: Date
}

// Storage type for dashboards (keyed by connectionId)
export interface DashboardStorage {
  [connectionId: string]: DashboardConfig[]
}

// Cloud storage provider types
export type CloudStorageProvider = 'github-gist' | 's3' | 'azure-blob' | 'gcs'

export interface CloudStorageConfig {
  provider: CloudStorageProvider
  enabled: boolean
  // GitHub Gist
  githubToken?: string
  gistId?: string
  // AWS S3
  s3Bucket?: string
  s3Region?: string
  s3AccessKeyId?: string
  s3SecretAccessKey?: string
  s3Key?: string
  // Azure Blob Storage
  azureConnectionString?: string
  azureContainer?: string
  azureBlobName?: string
  // Google Cloud Storage
  gcsBucket?: string
  gcsKeyFile?: string
  gcsObjectName?: string
}

// Sync status for cloud storage
export interface DashboardSyncStatus {
  lastSyncedAt?: Date
  syncError?: string
  isSyncing: boolean
}

// Export/Import format for dashboards
export interface DashboardExport {
  version: string
  exportedAt: string
  dashboards: DashboardConfig[]
}
