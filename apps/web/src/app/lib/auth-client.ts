import { createAuthClient } from 'better-auth/react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'

export const authClient = createAuthClient({
  baseURL: API_URL,
})

export const signInSocial = async (
  provider: 'google' | 'github',
  codeChallenge: string
) => {
  const callbackURL = `${APP_URL}/callback?challenge=${encodeURIComponent(codeChallenge)}`
  await authClient.signIn.social({ provider, callbackURL })
}

export const getSession = async () => {
  const session = await authClient.getSession()
  return session
}

export const signOut = async (challenge?: string | null) => {
  await authClient.signOut({
    fetchOptions: {
      onSuccess: () => {
        const url = challenge ? `/login?challenge=${encodeURIComponent(challenge)}` : '/login'
        window.location.href = url
      },
    },
  })
}
