function getWindowApi() {
  if (typeof window === 'undefined' || !window.windowApi) {
    throw new Error(
      'Window API is not available. Ensure preload is loaded and contextIsolation is enabled.'
    )
  }
  return window.windowApi
}

export const windowClient = {
  async minimizeWindow(): Promise<void> {
    return getWindowApi().minimizeWindow()
  },

  async maximizeWindow(): Promise<void> {
    return getWindowApi().maximizeWindow()
  },

  async closeWindow(): Promise<void> {
    return getWindowApi().closeWindow()
  },

  async moveWindow(deltaX: number, deltaY: number): Promise<void> {
    return getWindowApi().moveWindow(deltaX, deltaY)
  }
}
