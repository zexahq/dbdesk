import { ElectronAPI } from '@electron-toolkit/preload'
import type { DbdeskAPI } from './dbdesk-api'
import type { WindowAPI } from './window-api'
export type { DbdeskAPI } from './dbdesk-api'
export type { WindowAPI } from './window-api'

declare global {
  interface Window {
    electron: ElectronAPI
    dbdesk: DbdeskAPI
    windowApi: WindowAPI
    env: {
      API_URL: string
      WEB_URL: string
    }
  }
}
