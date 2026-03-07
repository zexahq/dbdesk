import { ElectronAPI } from '@electron-toolkit/preload'
import type { DbdeskAPI } from './dbdesk-api'
import type { WindowAPI } from './window-api'
export type { DbdeskAPI } from './dbdesk-api'
export type { WindowAPI } from './window-api'

declare global {
  type AuthenticatedUser = {
    id: string
    name: string
    email: string
    image?: string | null
  }

  type AuthErrorContext = {
    message: string
  }

  interface Window {
    electron: ElectronAPI
    dbdesk: DbdeskAPI
    windowApi: WindowAPI
    requestAuth: (options?: { provider?: string }) => Promise<void>
    onAuthenticated: (callback: (user: AuthenticatedUser) => void) => () => void
    onUserUpdated: (callback: (user: AuthenticatedUser | null) => void) => () => void
    onAuthError: (callback: (ctx: AuthErrorContext) => void) => () => void
    env: {
      API_URL: string
      WEB_URL: string
    }
  }
}
