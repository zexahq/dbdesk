export class BaseAppError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = new.target.name
  }
}

export class ValidationError extends BaseAppError {}

export class ConnectionError extends BaseAppError {}

export class QueryError extends BaseAppError {}

export interface SanitizedError {
  name: string
  message: string
}

export const sanitizeError = (error: unknown): SanitizedError => {
  if (error instanceof ValidationError) {
    return { name: error.name, message: error.message }
  }

  if (error instanceof BaseAppError) {
    return { name: error.name, message: error.message }
  }

  if (error instanceof Error) {
    return { name: 'Error', message: error.message }
  }

  return { name: 'Error', message: 'An unexpected error occurred' }
}
