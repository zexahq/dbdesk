import { electronAPI } from '@electron-toolkit/preload'
import { contextBridge } from 'electron'
import { dbdeskAPI } from './dbdesk-api'
import { windowAPI } from './window-api'
import { challengeAPI } from './challenge-api'
import { envConfig } from './env-config'

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('dbdesk', dbdeskAPI)
    contextBridge.exposeInMainWorld('windowApi', windowAPI)
    // Expose safe env config (non-sensitive values)
    contextBridge.exposeInMainWorld('env', {
      API_URL: envConfig.API_URL,
      WEB_URL: envConfig.WEB_URL
    })
    // Expose challenge API (secret never exposed, kept in preload)
    contextBridge.exposeInMainWorld('challenge', challengeAPI)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.dbdesk = dbdeskAPI
  // @ts-ignore (define in dts)
  window.windowApi = windowAPI
  // @ts-ignore (define in dts)
  window.env = {
    API_URL: envConfig.API_URL,
    WEB_URL: envConfig.WEB_URL
  }
  // @ts-ignore (define in dts)
  window.challenge = challengeAPI
}
