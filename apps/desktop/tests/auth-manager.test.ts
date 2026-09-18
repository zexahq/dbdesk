import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  clearCachedSession: vi.fn(),
  getCachedSession: vi.fn(),
  getRemoteSession: vi.fn(),
  hasCachedSession: vi.fn(),
  isSecureStorageAvailable: vi.fn(),
  setCachedSession: vi.fn()
}))

vi.mock('../src/main/lib/better-auth-client', () => ({
  betterAuthClient: {
    getSession: mocks.getRemoteSession,
    requestAuth: vi.fn(),
    setupMain: vi.fn(),
    signOut: vi.fn()
  }
}))

vi.mock('../src/main/lib/secure-storage', () => ({
  isSecureStorageAvailable: mocks.isSecureStorageAvailable
}))

vi.mock('../src/main/lib/session-cache', () => ({
  clearCachedSession: mocks.clearCachedSession,
  getCachedSession: mocks.getCachedSession,
  hasCachedSession: mocks.hasCachedSession,
  setCachedSession: mocks.setCachedSession
}))

import { authManager } from '../src/main/lib/auth-manager'

const session = {
  session: {
    id: 'session-1',
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    token: 'token-1',
    userId: 'user-1'
  },
  user: {
    id: 'user-1',
    name: 'Ada',
    email: 'ada@example.com',
    image: null
  }
}

describe('auth session recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.isSecureStorageAvailable.mockReturnValue(true)
    mocks.hasCachedSession.mockReturnValue(false)
    mocks.getCachedSession.mockReturnValue(null)
  })

  it('recovers a plugin-persisted session without blocking local startup', async () => {
    mocks.getRemoteSession.mockResolvedValue({ data: session })

    expect(authManager.getSession()).toBeNull()

    await vi.waitFor(() => expect(mocks.setCachedSession).toHaveBeenCalledOnce())
    expect(mocks.setCachedSession).toHaveBeenCalledWith({
      id: 'session-1',
      userId: 'user-1',
      userName: 'Ada',
      userEmail: 'ada@example.com',
      userImage: null,
      sessionToken: 'token-1',
      sessionExpiresAt: expect.any(Number)
    })
  })

  it('preserves cached authentication during network failure', async () => {
    const cached = {
      id: 'session-1',
      userId: 'user-1',
      userName: 'Ada',
      userEmail: 'ada@example.com',
      userImage: null,
      sessionToken: 'token-1',
      sessionExpiresAt: Date.now() + 60_000,
      cachedAt: Date.now()
    }
    mocks.getCachedSession.mockReturnValue(cached)
    mocks.hasCachedSession.mockReturnValue(true)
    mocks.getRemoteSession.mockRejectedValue(new Error('offline'))

    await authManager.verifySessionInBackground()

    expect(mocks.clearCachedSession).not.toHaveBeenCalled()
  })

  it('does not query or erase sessions while the keychain is unavailable', async () => {
    mocks.isSecureStorageAvailable.mockReturnValue(false)
    mocks.hasCachedSession.mockReturnValue(true)

    await authManager.verifySessionInBackground()

    expect(mocks.getRemoteSession).not.toHaveBeenCalled()
    expect(mocks.clearCachedSession).not.toHaveBeenCalled()
  })
})
