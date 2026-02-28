import { typedHandle } from './typed-handle'
import { downloadUpdate, getAppVersion, quitAndInstall } from '../lib/auto-updater'
import { autoUpdater } from 'electron-updater'

export function registerUpdateHandlers() {
  typedHandle('update:check', async () => {
    await autoUpdater.checkForUpdates().catch(() => {})
  })

  typedHandle('update:download', async () => {
    downloadUpdate()
  })

  typedHandle('update:install', async () => {
    quitAndInstall()
  })

  typedHandle('update:get-version', async () => {
    return { version: getAppVersion() }
  })
}
