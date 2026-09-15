import { typedHandle } from './typed-handle'
import {
  checkForUpdates,
  downloadUpdate,
  getAppVersion,
  getUpdateState,
  quitAndInstall
} from '../lib/auto-updater'

export function registerUpdateHandlers() {
  typedHandle('update:check', async () => {
    return checkForUpdates()
  })

  typedHandle('update:download', async () => {
    await downloadUpdate()
  })

  typedHandle('update:install', async () => {
    quitAndInstall()
  })

  typedHandle('update:get-version', async () => {
    return { version: getAppVersion() }
  })

  typedHandle('update:get-state', async () => {
    return getUpdateState()
  })
}
