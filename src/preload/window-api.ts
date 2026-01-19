import { ipcRenderer } from 'electron'

export const windowAPI = {
  /**
   * Minimize the application window
   */
  async minimizeWindow(): Promise<void> {
    return ipcRenderer.invoke('window:minimize')
  },

  /**
   * Maximize or restore the application window
   */
  async maximizeWindow(): Promise<void> {
    return ipcRenderer.invoke('window:maximize')
  },

  /**
   * Close the application window
   */
  async closeWindow(): Promise<void> {
    return ipcRenderer.invoke('window:close')
  },

  /**
   * Move the window by delta coordinates
   */
  async moveWindow(deltaX: number, deltaY: number): Promise<void> {
    return ipcRenderer.invoke('window:move', { deltaX, deltaY })
  }
}

export type WindowAPI = typeof windowAPI
