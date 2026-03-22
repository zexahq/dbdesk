import { electronClient } from '@better-auth/electron/client'
import { createAuthClient } from 'better-auth/client'
import { authStorage } from './auth-storage'

declare const __API_URL__: string
declare const __WEB_URL__: string

export const betterAuthClient = createAuthClient({
  baseURL: __API_URL__,
  plugins: [
    electronClient({
      signInURL: `${__WEB_URL__}/login`,
      protocol: {
        scheme: 'dbdesk',
      },
      callbackPath: '/callback',
      storage: authStorage,
    }),
  ],
})
