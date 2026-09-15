import type { UpdateState } from '@dbdesk/shared/types'
import { autoUpdater, type UpdateInfo } from 'electron-updater'
import { is } from '@electron-toolkit/utils'
import { app, BrowserWindow } from 'electron'
import { appendFile, existsSync, mkdirSync, statSync, truncateSync } from 'fs'
import { join } from 'path'

/**
 * Auto-updater — checks for new versions via GitHub Releases.
 *
 * In production the updater runs on the `electron-builder.yml` publish config.
 *
 * State is forwarded to the renderer via `webContents.send()`.
 */

// Do not auto-download; let the user decide.
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

let state: UpdateState = { status: 'idle' }
const maxLogSize = 5 * 1024 * 1024

function configureLogging(): void {
  let logFile: string
  try {
    const logDirectory = app.getPath('logs')
    mkdirSync(logDirectory, { recursive: true })
    logFile = join(logDirectory, 'updater.log')
    if (existsSync(logFile) && statSync(logFile).size > maxLogSize) truncateSync(logFile)
  } catch (error) {
    console.error('[auto-updater] Failed to configure file logging', error)
    return
  }
  const write = (level: string, values: unknown[]) => {
    const message = values
      .map((value) => (value instanceof Error ? (value.stack ?? value.message) : String(value)))
      .join(' ')
    appendFile(logFile, `${new Date().toISOString()} [${level}] ${message}\n`, (error) => {
      if (error) console.error('[auto-updater] Failed to write log', error)
    })
  }

  autoUpdater.logger = {
    debug: (...values: unknown[]) => write('debug', values),
    info: (...values: unknown[]) => write('info', values),
    warn: (...values: unknown[]) => write('warn', values),
    error: (...values: unknown[]) => write('error', values)
  }
}

function setState(nextState: UpdateState): void {
  state = nextState
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('update:state', state)
  }
}

/** Initialise the auto-updater and register listeners. */
export function initAutoUpdater(): void {
  // Skip updates in development
  if (is.dev) return
  configureLogging()

  autoUpdater.on('checking-for-update', () => {
    setState({ status: 'checking' })
  })

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    setState({
      status: 'available',
      version: info.version,
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined
    })
  })

  autoUpdater.on('update-not-available', () => {
    setState({ status: 'up-to-date' })
  })

  autoUpdater.on('download-progress', (progress) => {
    if (state.status !== 'downloading') return
    setState({ ...state, percent: Math.round(progress.percent) })
  })

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    setState({ status: 'downloaded', version: info.version })
  })

  autoUpdater.on('error', (err) => {
    console.error('[auto-updater]', err)
    setState({ status: 'error', message: err.message })
  })

  // Check once on startup (after a short delay to not block the window)
  setTimeout(() => {
    void checkForUpdates()
  }, 5_000)

  // Then every 4 hours
  setInterval(
    () => {
      void checkForUpdates()
    },
    4 * 60 * 60 * 1000
  )
}

/** Check GitHub Releases for an update. */
export async function checkForUpdates(): Promise<UpdateState> {
  if (is.dev) return state
  if (['checking', 'downloading', 'downloaded'].includes(state.status)) return state

  try {
    await autoUpdater.checkForUpdates()
  } catch (error) {
    if (state.status !== 'error') {
      setState({ status: 'error', message: error instanceof Error ? error.message : String(error) })
    }
  }
  return state
}

/** Trigger manual download of a pending update. */
export async function downloadUpdate(): Promise<void> {
  if (state.status !== 'available') return

  setState({ status: 'downloading', version: state.version, percent: 0 })
  try {
    await autoUpdater.downloadUpdate()
  } catch (error) {
    if (getUpdateState().status !== 'error') {
      setState({ status: 'error', message: error instanceof Error ? error.message : String(error) })
    }
  }
}

/** Quit the app and install the downloaded update. */
export function quitAndInstall(): void {
  if (state.status === 'downloaded') autoUpdater.quitAndInstall(false, true)
}

/** Return current app version. */
export function getAppVersion(): string {
  return app.getVersion()
}

export function getUpdateState(): UpdateState {
  return state
}
