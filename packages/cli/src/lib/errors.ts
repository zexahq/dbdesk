export type ErrorCode =
  | 'usage'
  | 'not-found'
  | 'connection-failed'
  | 'query-failed'
  | 'db-error'
  | 'schema-newer'
  | 'validation-failed'
  | 'cancelled'

const EXIT_CODES: Record<ErrorCode, number> = {
  usage: 2,
  'not-found': 4,
  'connection-failed': 3,
  'query-failed': 5,
  'db-error': 5,
  'schema-newer': 5,
  'validation-failed': 2,
  cancelled: 1
}

export function exitCodeFor(code: ErrorCode): number {
  return EXIT_CODES[code]
}

export class CliError extends Error {
  readonly code: ErrorCode
  readonly hint?: string

  constructor(code: ErrorCode, message: string, hint?: string) {
    super(message)
    this.name = 'CliError'
    this.code = code
    this.hint = hint
  }
}

export function isCliError(err: unknown): err is CliError {
  return err instanceof CliError
}
