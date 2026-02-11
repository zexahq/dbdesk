import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function cleanErrorMessage(message: string): string {
  // Remove Electron IPC wrapper (e.g., "Error invoking remote method 'query:run': QueryError: actual message")
  let cleaned = message.replace(/^Error invoking remote method '[^']+': /, '')
  // Remove error class name prefix (e.g., "QueryError:", "ValidationError:")
  cleaned = cleaned.replace(/^[A-Za-z]+Error:\s*/, '')
  // Capitalize first letter
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  return cleaned
}

/**
 * Generate a unique ID with prefix
 * Uses timestamp + random suffix for uniqueness without external dependencies
 */
export function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
