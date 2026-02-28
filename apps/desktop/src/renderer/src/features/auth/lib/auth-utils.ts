/**
 * Auth utilities for the renderer.
 *
 * Login URL generation and PKCE are fully handled by the main process
 * via IPC. This file re-exports the helper for convenience.
 */
export { getLoginUrl } from './auth'
