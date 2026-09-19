import { describe, expect, it } from 'vitest'
import { chooseStoredSecret, splitConnectionOptions } from '../src/main/storage'

describe('connection secret storage', () => {
  it('removes credentials from persisted public options', () => {
    const { publicOptions, secrets } = splitConnectionOptions({
      host: 'localhost',
      user: 'postgres',
      password: 'secret',
      connectionString: 'postgres://secret',
      sslMode: 'require'
    })

    expect(publicOptions).toEqual({ host: 'localhost', user: 'postgres', sslMode: 'require' })
    expect(secrets).toEqual({ password: 'secret', connectionString: 'postgres://secret' })
  })

  it('preserves existing ciphertext during a temporary keychain outage', () => {
    expect(chooseStoredSecret(null, 'safe-storage:v1:encrypted')).toBe('safe-storage:v1:encrypted')
    expect(chooseStoredSecret('safe-storage:v1:new', 'safe-storage:v1:old')).toBe(
      'safe-storage:v1:new'
    )
  })
})
