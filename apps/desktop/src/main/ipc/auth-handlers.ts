import { typedHandle } from './typed-handle'
import { authManager } from '../lib/auth-manager'

export function registerAuthHandlers() {
  typedHandle('auth:get-login-url', async () => {
    const url = authManager.getLoginUrl()
    return { url }
  })

  typedHandle('auth:get-session', async () => {
    return authManager.getSession()
  })

  typedHandle('auth:get-token', async () => {
    const token = await authManager.getToken()
    return { token }
  })

  typedHandle('auth:logout', async () => {
    await authManager.logout()
  })
}
