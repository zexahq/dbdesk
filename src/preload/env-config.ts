/**
 * Environment configuration - only access env vars in preload
 * Never expose secrets directly to renderer
 */
export const envConfig = {
  API_URL: process.env.VITE_API_URL || 'http://localhost:9876',
  WEB_URL: process.env.VITE_WEB_URL || 'http://localhost:3000',
  CHALLENGE_SECRET: process.env.VITE_CHALLENGE_SECRET || 'default-secret-key-change-in-prod'
}
