import { app, BrowserWindow } from 'electron'
import { authManager } from './auth-manager'

type DeepLinkHandler = (url: string) => void

let deepLinkHandler: DeepLinkHandler | null = null

/**
 * Register deep link handler
 * This is called when the app receives a dbdesk:// URL
 */
export function registerDeepLinkHandler(handler: DeepLinkHandler): void {
  deepLinkHandler = handler
}

/**
 * Setup protocol handler for dbdesk:// URLs
 * Must be called in the main process
 */
export function setupDeepLinkProtocol(): void {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('dbdesk', process.execPath, [process.argv[1]])
    }
  } else {
    app.setAsDefaultProtocolClient('dbdesk')
  }

  // Handle deep links passed on app launch (macOS)
  app.on('open-url', (event, url) => {
    event.preventDefault()
    handleDeepLink(url)
  })

  // Note: Windows/Linux deep links are handled in setupSingleInstanceLock()
  // to avoid duplicate handlers
}

/**
 * Setup single instance lock to prevent multiple instances
 * and to handle deep links for subsequent instances
 */
export function setupSingleInstanceLock(): boolean {
  const gotTheLock = app.requestSingleInstanceLock()

  if (!gotTheLock) {
    app.quit()
    return false
  }

  app.on('second-instance', (_event, argv) => {
    const deepLinkUrl = argv.find((arg) => arg.startsWith('dbdesk://'))
    if (deepLinkUrl) {
      handleDeepLink(deepLinkUrl)
    }

    // Focus the window if it exists
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      const window = windows[0]
      if (window.isMinimized()) window.restore()
      window.focus()
    }
  })

  return true
}

/**
 * Process a deep link URL
 */
function handleDeepLink(url: string): void {
  if (!deepLinkHandler) {
    console.warn('No deep link handler registered')
    return
  }

  // Validate URL format
  if (!url.startsWith('dbdesk://')) {
    console.error('Invalid deep link URL:', url)
    return
  }

  deepLinkHandler(url)
}

/**
 * Handle deep-link auth callback in the main process.
 *
 * The URL contains an auth `code` from the web login flow.
 * The main process exchanges code + stored PKCE verifier for a bearer
 * token and persists it in safeStorage. The renderer is then notified
 * via `auth:session-changed` so it can refresh its session state.
 */
export async function handleAuthDeepLink(mainWindow: BrowserWindow, url: string): Promise<void> {
  try {
    const urlObj = new URL(url)
    const code = urlObj.searchParams.get('code')

    if (!code) {
      console.error('[deep-link] Missing code in auth callback')
      return
    }

    const codeVerifier = authManager.consumeVerifier()
    if (!codeVerifier) {
      console.error('[deep-link] No pending PKCE verifier — login flow was not initiated')
      return
    }

    await authManager.exchangeCode(code, codeVerifier)

    // Notify renderer so it can refresh session state
    mainWindow.webContents.send('auth:session-changed')
  } catch (error) {
    console.error('[deep-link] Auth exchange failed:', error)
  }
}

/**
 * Parse deep link query parameters
 */
export function parseDeepLink(url: string): Record<string, string> | null {
  try {
    const urlObj = new URL(url)
    const params: Record<string, string> = {}

    urlObj.searchParams.forEach((value, key) => {
      params[key] = value
    })

    return params
  } catch {
    return null
  }
}
