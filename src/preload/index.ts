import { electronAPI } from '@electron-toolkit/preload'
import { contextBridge } from 'electron'
import { dbdeskAPI } from './dbdesk-api'
import { windowAPI } from './window-api'

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('dbdesk', dbdeskAPI)
    contextBridge.exposeInMainWorld('windowApi', windowAPI)
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
}
