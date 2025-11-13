import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { QueryResultRow } from '@common/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Convert each value in the row to a string representation keyed by column name
export const normalizeRow = (row: QueryResultRow): Record<string, string> => {
  return Object.entries(row).reduce<Record<string, string>>((acc, [key, value]) => {
    if (value === null) {
      acc[key] = 'NULL'
      return acc
    }

    if (value === undefined) {
      acc[key] = ''
      return acc
    }

    if (typeof value === 'object') {
      try {
        acc[key] = JSON.stringify(value)
      } catch {
        acc[key] = String(value)
      }
      return acc
    }

    acc[key] = String(value)
    return acc
  }, {})
}
