import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { app, BrowserWindow, ipcMain, protocol, shell } from 'electron'
import { join } from 'path'
import icon from '../../resources/icon.png?asset'
import './adapters'
import { connectionManager } from './connectionManager'
import { registerIpcHandlers } from './ipc-handlers'
import { AssetServer } from './protocols/asset-server'
import { AssetUrl } from './protocols/asset-url'

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.key === 'F12') {
      mainWindow.webContents.toggleDevTools()
    }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app-asset',
    privileges: {
      standard: true,
      supportFetchAPI: true,
      bypassCSP: true
    }
  }
])

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

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

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

  registerIpcHandlers()

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

    // Remove this handler to avoid recursion and quit again
    app.removeAllListeners('before-quit')
    app.quit()
  }

  void performQuit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
