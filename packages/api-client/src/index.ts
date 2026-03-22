/**
 * @dbdesk/api-client — Type-safe Hono RPC client
 *
 * Provides a fully typed client generated from the server's route definitions.
 * All request/response types are inferred automatically from the server.
 */

export { createApiClient, type ApiClient } from './client'
export { ApiError, unwrapResponse, type ApiErrorOptions, type ApiResponse } from './errors'
export { queryKeys } from './query-keys'
