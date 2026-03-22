/**
 * Structured query key factory for server endpoints.
 *
 * Usage with TanStack Query:
 * ```ts
 * useQuery({ queryKey: queryKeys.session(), queryFn: ... })
 * ```
 *
 * Extend this factory as new server routes are added.
 */
export const queryKeys = {
  /** Root key for all server queries */
  all: ['server'] as const,

  /** GET /api/session */
  session: () => [...queryKeys.all, 'session'] as const,

  /** POST /api/chat */
  chat: () => [...queryKeys.all, 'chat'] as const,
} as const
