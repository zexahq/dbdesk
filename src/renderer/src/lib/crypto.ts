import { nanoid } from 'nanoid'

/**
 * Generate a random code challenge for auth flow
 * This prevents token interception by requiring validation of the challenge
 */
export function generateCodeChallenge(): string {
  return nanoid(32)
}

/**
 * Encrypt a code challenge using XOR with a secret key
 * Simple but effective for preventing casual inspection
 */
export function encryptChallenge(challenge: string, secret: string): string {
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
export function decryptChallenge(encrypted: string, secret: string): string {
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
