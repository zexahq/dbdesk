import { nanoid } from 'nanoid'
import { envConfig } from './env-config'

/**
 * Challenge crypto operations - stays in preload, secret never exposed to renderer
 */

/**
 * Generate a random code challenge for auth flow
 * This prevents token interception by requiring validation of the challenge
 */
function generateCodeChallenge(): string {
  return nanoid(32)
}

/**
 * Encrypt a code challenge using XOR with a secret key
 * Simple but effective for preventing casual inspection
 */
function encryptChallenge(challenge: string, secret: string): string {
  const encoded = new TextEncoder().encode(challenge)
  const secretEncoded = new TextEncoder().encode(secret)

  const encrypted: number[] = []
  for (let i = 0; i < encoded.length; i++) {
    encrypted.push(encoded[i] ^ secretEncoded[i % secretEncoded.length])
  }

  // Convert to hex string without Buffer
  return Array.from(encrypted)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Decrypt a code challenge
 */
function decryptChallenge(encrypted: string, secret: string): string {
  // Convert hex string back to bytes without Buffer
  const encoded = new Uint8Array(
    encrypted.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
  )
  const secretEncoded = new TextEncoder().encode(secret)

  const decrypted: number[] = []
  for (let i = 0; i < encoded.length; i++) {
    decrypted.push(encoded[i] ^ secretEncoded[i % secretEncoded.length])
  }

  return new TextDecoder().decode(new Uint8Array(decrypted))
}

/**
 * Challenge API exposed to renderer - secret is never exposed
 */
export const challengeAPI = {
  /**
   * Generate challenge and encrypt it with stored secret
   * @returns encrypted challenge to send to web app
   */
  generate(): string {
    const challenge = generateCodeChallenge()
    const encrypted = encryptChallenge(challenge, envConfig.CHALLENGE_SECRET)
    // Store in localStorage via renderer (challenge manager will handle this)
    return encrypted
  },

  /**
   * Verify challenge matches encrypted value
   * @param encrypted - the encrypted challenge from storage
   * @param challenge - the challenge to verify
   * @returns true if challenge matches
   */
  verify(encrypted: string, challenge: string): boolean {
    try {
      const decrypted = decryptChallenge(encrypted, envConfig.CHALLENGE_SECRET)
      return decrypted === challenge
    } catch (error) {
      console.error('Failed to decrypt challenge:', error)
      return false
    }
  }
}
