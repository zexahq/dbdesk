import { typedHandle } from './typed-handle'
import { authManager } from '../lib/auth-manager'

export function registerAuthHandlers() {
  typedHandle('auth:get-session', async () => {
    // Prefer cached session for fast startup, but fall back to a fresh server
    // lookup when the Electron auth plugin has just handled a deep link and
    // persisted its session before our local cache exists.
    const cachedSession = authManager.getSession()
    const session = cachedSession ?? (await authManager.getSessionFresh())
    console.log('[ipc] auth:get-session →', session ? `user=${session.user?.email}` : 'null')
    return session
  })

  typedHandle('auth:get-token', async () => {
    const token = await authManager.getToken()
    console.log('[ipc] auth:get-token →', token ? 'has-token' : 'null')
    return { token }
  })

  typedHandle('auth:logout', async () => {
    await authManager.logout()
  })
}
