/**
 * Dev-only deep link relay for Linux.
 *
 * On Linux in dev, `setAsDefaultProtocolClient` doesn't work because there is
 * no installed .desktop file from the packager, and `electron-vite dev` launches
 * Electron differently than a standalone process — so the single-instance lock
 * can't bridge between them.
 *
 * Instead, we start a Unix domain socket server at a known path. A companion
 * `.desktop` file calls a relay script that connects to this socket and sends
 * the deep link URL. We then emit the `second-instance` event on `app` so the
 * @better-auth/electron plugin processes it exactly as if a real second instance
 * had triggered the deep link.
 */

import { createServer, type Server } from 'node:net'
import { unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { app, BrowserWindow } from 'electron'

const SOCKET_PATH = join(tmpdir(), 'dbdesk-dev-deeplink.sock')

let server: Server | null = null

export function startDevDeepLinkServer(): void {
  // Clean up stale socket from a previous run
  try {
    unlinkSync(SOCKET_PATH)
  } catch {
    // doesn't exist — fine
  }

  server = createServer((connection) => {
    let data = ''
    connection.on('data', (chunk) => {
      data += chunk.toString()
    })
    connection.on('end', () => {
      const url = data.trim()
      if (!url) return

      // Focus the existing window
      const win = BrowserWindow.getAllWindows()[0]
      if (win) {
        if (win.isMinimized()) win.restore()
        win.focus()
      }

      // Emit `second-instance` so the @better-auth/electron plugin's handler
      // processes the deep link. The plugin extracts the URL from either the
      // 4th argument or `commandLine.pop()`.
      app.emit('second-instance', {}, [url], '', url)
    })
  })

  server.on('error', (err) => {
    console.error('[dev-deep-link] socket server error:', err)
  })

  server.listen(SOCKET_PATH, () => {
    console.log('[dev-deep-link] listening on', SOCKET_PATH)
  })
}

export function stopDevDeepLinkServer(): void {
  if (server) {
    server.close()
    server = null
  }
  try {
    unlinkSync(SOCKET_PATH)
  } catch {
    // already gone
  }
}
