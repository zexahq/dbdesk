/* global __API_URL__, __WEB_URL__ */

declare const __API_URL__: string
declare const __WEB_URL__: string

/**
 * Environment configuration — values are injected at build time
 * via `define` in electron.vite.config.ts. No runtime dotenv needed.
 */
export const envConfig = {
  API_URL: __API_URL__,
  WEB_URL: __WEB_URL__,
}
