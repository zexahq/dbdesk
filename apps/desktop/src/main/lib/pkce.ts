import crypto from 'node:crypto'

/**
 * PKCE (Proof Key for Code Exchange) — industry-standard challenge/verifier pair.
 *
 * The code_verifier is a random secret kept in the main process.
 * The code_challenge is SHA-256(code_verifier), base64url-encoded, and sent
 * to the web login page so the server can later verify the exchange.
 */
export function generatePKCE() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url')
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')
  return { codeVerifier, codeChallenge }
}

/**
 * Verify that SHA-256(codeVerifier) matches the stored codeChallenge.
 */
export function verifyPKCE(codeVerifier: string, codeChallenge: string): boolean {
  const computed = crypto.createHash('sha256').update(codeVerifier).digest('base64url')
  return computed === codeChallenge
}
