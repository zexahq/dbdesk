/**
 * Typed error class for API responses.
 */
export interface ApiErrorOptions {
  status: number
  message: string
  details?: unknown
}

export class ApiError extends Error {
  readonly status: number
  readonly details?: unknown

  constructor(opts: ApiErrorOptions) {
    super(opts.message)
    this.name = 'ApiError'
    this.status = opts.status
    this.details = opts.details
  }
}

/**
 * Generic API response wrapper.
 * Consumers can use this for explicit typing when needed.
 */
export type ApiResponse<T> = { data: T; error?: never } | { data?: never; error: ApiError }

/**
 * Unwrap a Hono RPC response, throwing a typed `ApiError` on failure.
 *
 * @example
 * ```ts
 * const res = await api.api.session.$get()
 * const data = await unwrapResponse(res)
 * ```
 */
export async function unwrapResponse<T>(
  response: Response,
  options?: { onUnauthorized?: () => void },
): Promise<T> {
  if (response.status === 401) {
    options?.onUnauthorized?.()
    throw new ApiError({
      status: 401,
      message: 'Session expired. Please login again.',
    })
  }

  if (!response.ok) {
    let details: unknown
    try {
      details = await response.json()
    } catch {
      // body may not be JSON
    }

    const message =
      typeof details === 'object' && details !== null && 'message' in details
        ? String((details as Record<string, unknown>).message)
        : `Request failed: ${response.status}`

    throw new ApiError({ status: response.status, message, details })
  }

  return response.json() as Promise<T>
}
