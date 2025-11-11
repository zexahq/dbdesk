import { ElectronAPI } from '@electron-toolkit/preload'
import type { DbdeskAPI } from './dbdesk-api'
export type { DbdeskAPI } from './dbdesk-api'

declare global {
  interface Window {
    electron: ElectronAPI
    dbdesk: DbdeskAPI
  }
}
