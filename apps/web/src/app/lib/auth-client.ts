import { electronProxyClient } from '@better-auth/electron/proxy'
import { createAuthClient } from 'better-auth/react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [
    electronProxyClient({
      protocol: {
        scheme: 'dbdesk'
      },
      callbackPath: '/callback'
    })
  ]
})

export type ElectronAuthQuery = {
  client_id?: string
  state?: string
  code_challenge?: string
  code_challenge_method?: string
}

type TransferUserResponse = {
  electron_authorization_code: string
  redirect: boolean
  url: string | null
}

export function getElectronAuthQuery(searchParams: URLSearchParams): ElectronAuthQuery {
  return {
    client_id: searchParams.get('client_id') ?? undefined,
    state: searchParams.get('state') ?? undefined,
    code_challenge: searchParams.get('code_challenge') ?? undefined,
    code_challenge_method: searchParams.get('code_challenge_method') ?? undefined
  }
}

export function hasElectronAuthQuery(query: ElectronAuthQuery): boolean {
  return Boolean(query.client_id || query.state || query.code_challenge)
}

function toCallbackURL(query: ElectronAuthQuery): string {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    if (value) {
      params.set(key, value)
    }
  }

  const search = params.toString()
  return `${APP_URL}/callback${search ? `?${search}` : ''}`
}

export function toLoginURL(query: ElectronAuthQuery): string {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    if (value) {
      params.set(key, value)
    }
  }

  const search = params.toString()
  return `${APP_URL}/login${search ? `?${search}` : ''}`
}

export async function signInSocial(provider: 'google' | 'github', query: ElectronAuthQuery) {
  await authClient.signIn.social({
    provider,
    callbackURL: toCallbackURL(query),
    fetchOptions: {
      query
    }
  })
}

export async function transferElectronUser(
  query: ElectronAuthQuery
): Promise<TransferUserResponse> {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    if (value) {
      params.set(key, value)
    }
  }

  const response = await fetch(`${API_URL}/api/auth/electron/transfer-user?${params.toString()}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      callbackURL: toCallbackURL(query)
    })
  })

  if (!response.ok) {
    throw new Error('Failed to transfer the browser session to Electron.')
  }

  return response.json() as Promise<TransferUserResponse>
}
