import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { app, BrowserWindow, ipcMain, Menu, protocol, safeStorage, shell } from 'electron'
import { join } from 'path'

import icon from '../../resources/icon.png?asset'
import './adapters'
import { connectionManager } from './connectionManager'
import { initDatabase, closeDatabase, runMigrations } from '@dbdesk/db'
import { runDashboardYamlImportIfNeeded, runLegacyImportIfNeeded } from './db/legacy-import'
import { registerAllIpcHandlers } from './ipc'
import { authManager } from './lib/auth-manager'
import { initDashboardStorage } from './dashboard-storage'
import { AssetServer } from './protocols/asset-server'
import { AssetUrl } from './protocols/asset-url'
import { initAutoUpdater } from './lib/auto-updater'
import { startDevDeepLinkServer, stopDevDeepLinkServer } from './lib/dev-deep-link'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  // Create the browser window.
  const isMac = process.platform === 'darwin'
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    // On macOS use the native hidden-inset titlebar so we get real traffic
    // light buttons on the left. Position them so they're vertically centered
    // within our 36px (h-9) custom titlebar.
    ...(isMac
      ? {
          titleBarStyle: 'hiddenInset' as const,
          trafficLightPosition: { x: 12, y: 11 }
        }
      : {}),
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.key === 'F12') {
      mainWindow?.webContents.toggleDevTools()
    }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

// Register ALL custom schemes in a single call — Electron only allows
// protocol.registerSchemesAsPrivileged to be called once before app ready.
// The @better-auth/electron plugin also calls it internally for 'dbdesk'
// and 'user-image', so we monkey-patch it to a no-op after our call.
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app-asset',
    privileges: {
      standard: true,
      supportFetchAPI: true,
      bypassCSP: true
    }
  },
  {
    scheme: 'dbdesk',
    privileges: {
      secure: true,
      standard: false
    }
  },
  {
    scheme: 'user-image',
    privileges: {
      standard: false,
      secure: true,
      bypassCSP: true,
      stream: true
    }
  }
])
// Prevent the plugin from calling registerSchemesAsPrivileged again (would throw)
protocol.registerSchemesAsPrivileged = () => {}

// Debug: log deep link events (these fire in the main process → visible in terminal)
app.on('open-url', (_event, url) => {
  console.log('[deep-link] open-url received:', url)
})

const server = new AssetServer()
let workspaceFlushPromise: Promise<void> | null = null
let workspaceFlushCompleted = false

const requestWorkspaceFlush = async (): Promise<void> => {
  if (workspaceFlushCompleted) return
  if (workspaceFlushPromise) return workspaceFlushPromise

  const windows = BrowserWindow.getAllWindows()
  if (windows.length === 0) return

  workspaceFlushPromise = new Promise<void>((resolve) => {
    const timeout = setTimeout(resolve, 1000) // best-effort timeout

    ipcMain.once('workspace:flushed', () => {
      clearTimeout(timeout)
      resolve()
    })

    windows.forEach((window) => {
      window.webContents.send('workspace:flush')
    })
  })

  try {
    await workspaceFlushPromise
    workspaceFlushCompleted = true
  } finally {
    workspaceFlushPromise = null
  }
}

// Override userData path to use a clean name instead of the scoped package name
const getUserDataPath = (): string | undefined => {
  if (process.platform === 'linux') {
    const xdgConfig = process.env.XDG_CONFIG_HOME || join(process.env.HOME || '', '.config')
    return join(xdgConfig, 'dbdesk')
  }
  if (process.platform === 'darwin') {
    return join(process.env.HOME || '', 'Library', 'Application Support', 'dbdesk')
  }
  if (process.platform === 'win32') {
    return join(process.env.APPDATA || '', 'dbdesk')
  }
  return undefined
}

// Capture the default userData path before overriding so the legacy import
// can read JSON files from the old location when the path changes.
const previousUserDataPath = app.getPath('userData')

const userDataPath = getUserDataPath()
if (userDataPath) {
  app.setPath('userData', userDataPath)
}

// Initialize the database early so getSqlite()/getDb() are available before
// auth and IPC handlers can access local storage.
initDatabase(join(app.getPath('userData'), 'dbdesk.sqlite'))
runMigrations(join(__dirname, 'drizzle'))
runLegacyImportIfNeeded(previousUserDataPath)
runDashboardYamlImportIfNeeded(previousUserDataPath)

authManager.setup(() => mainWindow)

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // safeStorage must only be touched after app.ready: pre-ready
  // isEncryptionAvailable() checks can create bogus "Chromium Safe Storage"
  // keychain entries and spurious access prompts. On Linux without an OS
  // keyring, fall back to in-memory plaintext so auth still works.
  if (process.platform === 'linux' && !safeStorage.isEncryptionAvailable()) {
    safeStorage.setUsePlainTextEncryption(true)
  }

  // Initialize dashboard storage
  try {
    await initDashboardStorage()
    console.log('Dashboard storage initialized')
  } catch (error) {
    console.error('Failed to initialize dashboard storage:', error)
  }

  // Set app user model id for windows
  electronApp.setAppUserModelId('app.zexa.dbdesk')

  // Remove the application menu
  Menu.setApplicationMenu(null)

  protocol.handle('app-asset', (request) => {
    const asset = new AssetUrl(request.url)

    if (asset.isNodeModule) {
      return server.fromNodeModules(asset.relativeUrl)
    } else {
      return server.fromPublic(asset.relativeUrl)
    }
  })

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    let isFlushingOnClose = false

    window.on('close', (event) => {
      if (isFlushingOnClose || workspaceFlushCompleted) {
        return
      }

      event.preventDefault()
      isFlushingOnClose = true

      void (async () => {
        try {
          await requestWorkspaceFlush()
        } catch (error) {
          console.warn('Workspace flush on window close failed:', error)
        }

        window.removeAllListeners('close')
        window.close()
      })()
    })

    // Custom zoom handling - allow Ctrl+= and Ctrl+- for zoom
    window.webContents.on('before-input-event', (event, input) => {
      if (input.control || input.meta) {
        const key = input.key.toLowerCase()
        const webContents = window.webContents

        // Open new window with Ctrl+Shift+N
        if (input.shift && key === 'n') {
          event.preventDefault()
          createWindow()
        }
        // Zoom in with Ctrl+= or Ctrl++
        else if (key === '=' || key === '+') {
          event.preventDefault()
          const currentZoom = webContents.getZoomLevel()
          webContents.setZoomLevel(currentZoom + 0.5)
        }
        // Zoom out with Ctrl+-
        else if (key === '-' || key === '_') {
          event.preventDefault()
          const currentZoom = webContents.getZoomLevel()
          webContents.setZoomLevel(currentZoom - 0.5)
        }
        // Reset zoom with Ctrl+0
        else if (key === '0') {
          event.preventDefault()
          webContents.setZoomLevel(0)
        }
      }
    })

    optimizer.watchWindowShortcuts(window)
  })

  // Register window control handlers
  ipcMain.handle('window:minimize', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    window?.minimize()
  })

  ipcMain.handle('window:maximize', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return

    if (window.isMaximized()) {
      window.unmaximize()
    } else {
      window.maximize()
    }
  })

  ipcMain.handle('window:close', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    window?.close()
  })

  ipcMain.handle('window:move', (event, { deltaX, deltaY }) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return

    const bounds = window.getBounds()
    window.setBounds({
      x: bounds.x + deltaX,
      y: bounds.y + deltaY,
      width: bounds.width,
      height: bounds.height
    })
  })

  registerAllIpcHandlers()
  initAutoUpdater()

  // In dev on Linux, start a Unix socket server so that the .desktop file
  // relay script can forward deep link URLs to this running instance.
  if (is.dev && process.platform === 'linux') {
    startDevDeepLinkServer()
  }

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', (event) => {
  event.preventDefault()
  const performQuit = async () => {
    try {
      await requestWorkspaceFlush()
    } catch (error) {
      console.warn('Workspace flush on quit failed:', error)
    }

    await connectionManager.closeAll()
    closeDatabase()
    stopDevDeepLinkServer()

    // Remove this handler to avoid recursion and quit again
    app.removeAllListeners('before-quit')
    app.quit()
  }

  void performQuit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
