import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const listeners = new Map<string, ((value?: unknown) => void)[]>()
  let appPath = '/workspace/dbdesk/apps/desktop'
  const send = vi.fn()
  const truncate = vi.fn()
  const existsSync = vi.fn((path: string) => path.endsWith('updater.log'))
  const execFile = vi.fn(
    (
      _file: string,
      _args: string[],
      _options: unknown,
      callback: (error: Error | null, stdout: string, stderr: string) => void
    ) => callback(null, '', '')
  )
  const updater = {
    autoDownload: true,
    autoInstallOnAppQuit: false,
    logger: null as unknown,
    on: vi.fn((event: string, listener: (value?: unknown) => void) => {
      listeners.set(event, [...(listeners.get(event) ?? []), listener])
      return updater
    }),
    emit: (event: string, value?: unknown) => {
      listeners.get(event)?.forEach((listener) => listener(value))
    },
    checkForUpdates: vi.fn(async () => {
      updater.emit('update-not-available')
    }),
    downloadUpdate: vi.fn(async () => undefined),
    quitAndInstall: vi.fn()
  }

  return {
    execFile,
    existsSync,
    get appPath() {
      return appPath
    },
    set appPath(value: string) {
      appPath = value
    },
    send,
    truncate,
    updater
  }
})

vi.mock('@electron-toolkit/utils', () => ({ is: { dev: false } }))
vi.mock('electron-updater', () => ({ autoUpdater: mocks.updater }))
vi.mock('child_process', () => ({ execFile: mocks.execFile }))
vi.mock('electron', () => ({
  app: {
    getAppPath: () => mocks.appPath,
    getPath: () => '/tmp/dbdesk-updater-test',
    getVersion: () => '1.0.0'
  },
  BrowserWindow: {
    getAllWindows: () => [{ webContents: { send: mocks.send } }]
  }
}))
vi.mock('fs', () => ({
  appendFile: vi.fn(),
  existsSync: mocks.existsSync,
  mkdirSync: vi.fn(),
  statSync: () => ({ size: 6 * 1024 * 1024 }),
  truncateSync: mocks.truncate
}))

const platform = process.platform

beforeAll(() => Object.defineProperty(process, 'platform', { value: 'linux' }))
afterAll(() => Object.defineProperty(process, 'platform', { value: platform }))

describe('auto updater', () => {
  it('shares state and prevents duplicate downloads', async () => {
    vi.useFakeTimers()
    const updater = await import('../src/main/lib/auto-updater')
    updater.initAutoUpdater()
    expect(mocks.truncate).toHaveBeenCalledWith('/tmp/dbdesk-updater-test/updater.log')

    expect(await updater.checkForUpdates()).toEqual({ status: 'up-to-date' })

    mocks.updater.emit('update-available', { version: '1.1.0', releaseNotes: 'Fixes' })
    expect(updater.getUpdateState()).toEqual({
      status: 'available',
      version: '1.1.0',
      releaseNotes: 'Fixes'
    })

    await Promise.all([updater.downloadUpdate(), updater.downloadUpdate()])
    expect(mocks.updater.downloadUpdate).toHaveBeenCalledOnce()
    expect(updater.getUpdateState()).toEqual({
      status: 'downloading',
      version: '1.1.0',
      percent: 0
    })

    mocks.updater.emit('download-progress', { percent: 49.6 })
    expect(updater.getUpdateState()).toMatchObject({ status: 'downloading', percent: 50 })

    mocks.updater.emit('update-downloaded', { version: '1.1.0' })
    updater.quitAndInstall()
    expect(mocks.updater.quitAndInstall).toHaveBeenCalledWith(false, true)
    expect(mocks.send).toHaveBeenCalledWith('update:state', {
      status: 'downloaded',
      version: '1.1.0'
    })

    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('uses Homebrew updates on macOS', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' })
    mocks.appPath = '/Applications/DBDesk.app/Contents/Resources/app.asar'
    mocks.existsSync.mockImplementation((path) =>
      [
        '/tmp/dbdesk-updater-test/updater.log',
        '/opt/homebrew/bin/brew',
        '/opt/homebrew/Caskroom/dbdesk'
      ].includes(path)
    )
    mocks.execFile.mockImplementation((_file, args, _options, callback) => {
      callback(
        null,
        args.includes('outdated')
          ? JSON.stringify({
              formulae: [],
              casks: [{ name: 'dbdesk', current_version: '1.1.0' }]
            })
          : '',
        ''
      )
    })
    vi.resetModules()
    const checkCalls = mocks.updater.checkForUpdates.mock.calls.length

    try {
      const updater = await import('../src/main/lib/auto-updater')
      updater.initAutoUpdater()

      expect(await updater.checkForUpdates()).toEqual({
        status: 'manual',
        method: 'homebrew',
        message: 'Homebrew has v1.1.0 ready. Run: brew upgrade --cask zexahq/dbdesk/dbdesk'
      })
      expect(mocks.updater.checkForUpdates).toHaveBeenCalledTimes(checkCalls)
      expect(mocks.execFile).toHaveBeenCalledTimes(2)
    } finally {
      Object.defineProperty(process, 'platform', { value: 'linux' })
      mocks.appPath = '/workspace/dbdesk/apps/desktop'
      mocks.existsSync.mockImplementation((path) => path.endsWith('updater.log'))
    }
  })

  it('sends macOS DMG installs to Downloads', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' })
    vi.resetModules()

    try {
      const updater = await import('../src/main/lib/auto-updater')
      updater.initAutoUpdater()

      expect(updater.getUpdateState()).toEqual({
        status: 'manual',
        method: 'download',
        message:
          'DBDesk is not Developer ID signed yet, so this DMG cannot update in-app. Open Downloads and install the latest DMG manually.'
      })
    } finally {
      Object.defineProperty(process, 'platform', { value: 'linux' })
    }
  })
})
