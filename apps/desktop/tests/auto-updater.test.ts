import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const listeners = new Map<string, ((value?: unknown) => void)[]>()
  const send = vi.fn()
  const truncate = vi.fn()
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

  return { send, truncate, updater }
})

vi.mock('@electron-toolkit/utils', () => ({ is: { dev: false } }))
vi.mock('electron-updater', () => ({ autoUpdater: mocks.updater }))
vi.mock('electron', () => ({
  app: {
    getPath: () => '/tmp/dbdesk-updater-test',
    getVersion: () => '1.0.0'
  },
  BrowserWindow: {
    getAllWindows: () => [{ webContents: { send: mocks.send } }]
  }
}))
vi.mock('fs', () => ({
  appendFile: vi.fn(),
  existsSync: () => true,
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
    vi.resetModules()
    const checkCalls = mocks.updater.checkForUpdates.mock.calls.length

    try {
      const updater = await import('../src/main/lib/auto-updater')
      updater.initAutoUpdater()

      expect(await updater.checkForUpdates()).toEqual({
        status: 'manual',
        message: 'Update with Homebrew: brew upgrade --cask zexahq/dbdesk/dbdesk'
      })
      expect(mocks.updater.checkForUpdates).toHaveBeenCalledTimes(checkCalls)
    } finally {
      Object.defineProperty(process, 'platform', { value: 'linux' })
    }
  })
})
