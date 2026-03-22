import { app, BrowserWindow } from 'electron'
import { autoUpdater, type UpdateInfo } from 'electron-updater'
import { is } from '@electron-toolkit/utils'

/**
 * Auto-updater — checks for new versions via GitHub Releases.
 *
 * In production the updater runs on the `electron-builder.yml` publish config.
 * In development it reads from `dev-app-update.yml` instead.
 *
 * Events are forwarded to the renderer via `webContents.send()`:
 *   - update:available    → { version, releaseNotes }
 *   - update:downloaded   → { version }
 *   - update:error        → { message }
 *   - update:progress     → { percent }
 */

// Do not auto-download; let the user decide.
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

let updateAvailable = false

function notifyAllWindows(channel: string, payload: unknown) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload)
  }
}

/** Initialise the auto-updater and register listeners. */
export function initAutoUpdater(): void {
  // Skip updates in development
  if (is.dev) return

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    updateAvailable = true
    notifyAllWindows('update:available', {
      version: info.version,
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined,
    })
  })

  autoUpdater.on('update-not-available', () => {
    updateAvailable = false
  })

  autoUpdater.on('download-progress', (progress) => {
    notifyAllWindows('update:progress', { percent: Math.round(progress.percent) })
  })

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    notifyAllWindows('update:downloaded', { version: info.version })
  })

  autoUpdater.on('error', (err) => {
    console.error('[auto-updater]', err)
    notifyAllWindows('update:error', { message: err.message })
  })

  // Check once on startup (after a short delay to not block the window)
  setTimeout(() => {
    void autoUpdater.checkForUpdates().catch(() => {})
  }, 5_000)

  // Then every 4 hours
  setInterval(
    () => {
      void autoUpdater.checkForUpdates().catch(() => {})
    },
    4 * 60 * 60 * 1000,
  )
}

/** Trigger manual download of a pending update. */
export function downloadUpdate(): void {
  if (updateAvailable) {
    void autoUpdater.downloadUpdate().catch(() => {})
  }
}

/** Quit the app and install the downloaded update. */
export function quitAndInstall(): void {
  autoUpdater.quitAndInstall()
}

/** Return current app version. */
export function getAppVersion(): string {
  return app.getVersion()
}
