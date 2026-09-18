export type DatabaseToolMode = 'backup' | 'restore'

export type DatabaseBackupFormat = 'custom' | 'plain' | 'tar'

export interface DatabaseToolRequest {
  connectionId: string
  mode: DatabaseToolMode
  format: DatabaseBackupFormat
  filePath: string
  schemas?: string[]
  tables?: string[]
  clean?: boolean
  verbose?: boolean
  customArgs?: string
}

export interface DatabaseToolProgress {
  jobId: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  stream: 'system' | 'stdout' | 'stderr'
  message: string
}
