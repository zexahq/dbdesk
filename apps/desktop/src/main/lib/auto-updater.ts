import type { UpdateState } from '@dbdesk/shared/types'
import { autoUpdater, type UpdateInfo } from 'electron-updater'
import { is } from '@electron-toolkit/utils'
import { app, BrowserWindow } from 'electron'
import { execFile } from 'child_process'
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

type HomebrewInstallation = {
  executable: string
  packageFlag: '--cask' | '--formula'
  upgradeCommand: string
}

function findHomebrewInstallation(): HomebrewInstallation | null {
  const packageDirectory = process.platform === 'darwin' ? 'Caskroom' : 'Cellar'
  const prefixes = [
    process.env.HOMEBREW_PREFIX,
    '/opt/homebrew',
    '/usr/local',
    '/home/linuxbrew/.linuxbrew'
  ]

  for (const prefix of prefixes) {
    if (!prefix) continue
    const executable = join(prefix, 'bin', 'brew')
    if (!existsSync(executable) || !existsSync(join(prefix, packageDirectory, 'dbdesk'))) continue
    const runningHomebrewPackage =
      process.platform === 'darwin'
        ? app.getAppPath().startsWith('/Applications/DBDesk.app/')
        : process.env.APPIMAGE?.startsWith(`${join(prefix, packageDirectory, 'dbdesk')}/`)
    if (!runningHomebrewPackage) continue

    return {
      executable,
      packageFlag: process.platform === 'darwin' ? '--cask' : '--formula',
      upgradeCommand:
        process.platform === 'darwin'
          ? 'brew upgrade --cask zexahq/dbdesk/dbdesk'
          : 'brew upgrade zexahq/dbdesk/dbdesk'
    }
  }

  return null
}

const homebrewInstallation = findHomebrewInstallation()

function getManualUpdateState(message?: string): UpdateState | null {
  if (homebrewInstallation) {
    const reason =
      process.platform === 'darwin'
        ? 'Because DBDesk is not Developer ID signed yet, macOS updates are handled by Homebrew.'
        : 'Updates are handled by Homebrew.'
    return {
      status: 'manual',
      method: 'homebrew',
      message:
        message ?? `Installed with Homebrew. ${reason} Run: ${homebrewInstallation.upgradeCommand}`
    }
  }

  if (process.platform === 'darwin') {
    return {
      status: 'manual',
      method: 'download',
      message:
        'DBDesk is not Developer ID signed yet, so this DMG cannot update in-app. Open Downloads and install the latest DMG manually.'
    }
  }

  return null
}

function runHomebrew(installation: HomebrewInstallation, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      installation.executable,
      args,
      {
        encoding: 'utf8',
        env: { ...process.env, HOMEBREW_NO_AUTO_UPDATE: '1' },
        timeout: 120_000
      },
      (error, stdout, stderr) => {
        if (error) reject(new Error(stderr.trim() || error.message))
        else resolve(stdout)
      }
    )
  })
}

async function checkHomebrewUpdates(installation: HomebrewInstallation): Promise<UpdateState> {
  setState({ status: 'checking' })
  try {
    await runHomebrew(installation, ['update', '--quiet'])
    const output = await runHomebrew(installation, [
      'outdated',
      installation.packageFlag,
      '--json=v2'
    ])
    const packages = JSON.parse(output) as {
      casks?: Array<{ name: string; current_version: string }>
      formulae?: Array<{ name: string; current_version: string }>
    }
    const update = [...(packages.casks ?? []), ...(packages.formulae ?? [])].find(
      ({ name }) => name === 'dbdesk' || name.endsWith('/dbdesk')
    )
    const message = update
      ? `Homebrew has v${update.current_version} ready. Run: ${installation.upgradeCommand}`
      : 'Homebrew reports DBDesk is up to date.'
    const nextState = getManualUpdateState(message)!
    setState(nextState)
    return nextState
  } catch (error) {
    const message = `Homebrew check failed: ${error instanceof Error ? error.message : String(error)}. Run: ${installation.upgradeCommand}`
    const nextState = getManualUpdateState(message)!
    setState(nextState)
    return nextState
  }
}

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
  const manualState = getManualUpdateState()
  if (manualState) {
    state = manualState
    return
  }

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
  if (state.status === 'checking') return state
  if (homebrewInstallation) return checkHomebrewUpdates(homebrewInstallation)

  const manualState = getManualUpdateState()
  if (manualState) {
    state = manualState
    return state
  }
  if (is.dev) return state
  if (['downloading', 'downloaded'].includes(state.status)) return state

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
