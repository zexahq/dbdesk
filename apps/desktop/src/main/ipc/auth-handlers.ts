import { typedHandle } from './typed-handle'
import { authManager } from '../lib/auth-manager'

export function registerAuthHandlers() {
  typedHandle('auth:get-session', async () => {
    // Returns cached session immediately (no network)
    const session = authManager.getSession()
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
