import { formatInTimeZone } from 'date-fns-tz'
import { COMMON_TIMEZONES } from '@common/constants'

export interface DateTimeComponents {
  date: Date
  hour: number
  minute: number
  second: number
  timezone: string
}

/**
 * Get timezone label from timezone value
 */
export function getTimezoneLabel(tzValue: string, currentTimezone: string): string {
  if (tzValue === currentTimezone) return 'Current Timezone'
  const tz = COMMON_TIMEZONES.find((t) => t.value === tzValue)
  return tz?.label || tzValue
}

/**
 * Parse and validate datetime input string
 */
export function parseAndValidateInput(input: string): {
  valid: boolean
  date?: Date
  error?: string
} {
  if (!input.trim()) {
    return { valid: false, error: 'Date/time is required' }
  }

  // Remove timezone offset if present (e.g., "+05:30" or "-08:00")
  const cleanedInput = input.replace(/[+-]\d{2}:\d{2}\s*$/, '').trim()

  const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})\s(\d{2}):(\d{2}):(\d{2})$/
  const match = cleanedInput.match(dateRegex)

  if (!match) {
    return { valid: false, error: 'Format: MM/DD/YYYY HH:mm:ss' }
  }

  const [, month, day, year, hour, minute, second] = match
  const m = parseInt(month, 10)
  const d = parseInt(day, 10)
  const y = parseInt(year, 10)
  const h = parseInt(hour, 10)
  const min = parseInt(minute, 10)
  const sec = parseInt(second, 10)

  // Strict validation - no values outside valid ranges
  if (isNaN(m) || m < 1 || m > 12) {
    return { valid: false, error: 'Month must be 01-12' }
  }
  if (isNaN(d) || d < 1 || d > 31) {
    return { valid: false, error: 'Day must be 01-31' }
  }
  if (isNaN(h) || h < 0 || h > 23) {
    return { valid: false, error: 'Hour must be 00-23' }
  }
  if (isNaN(min) || min < 0 || min > 59) {
    return { valid: false, error: 'Minute must be 00-59' }
  }
  if (isNaN(sec) || sec < 0 || sec > 59) {
    return { valid: false, error: 'Second must be 00-59' }
  }

  // Validate year is reasonable (1900-2100)
  if (y < 1900 || y > 2100) {
    return { valid: false, error: 'Year must be between 1900 and 2100' }
  }

  try {
    const date = new Date(y, m - 1, d, h, min, sec)
    // Validate the date was created correctly (catch invalid dates like Feb 30)
    if (date.getMonth() !== m - 1 || date.getDate() !== d) {
      return { valid: false, error: 'Invalid date' }
    }
    return { valid: true, date }
  } catch {
    return { valid: false, error: 'Invalid date/time' }
  }
}

/**
 * Build a Date object from separate date and time components
 */

/**
 * Extract date/time components from UTC instant for a specific timezone
 */
export function extractComponentsFromUtc(
  utcDate: Date,
  timezone: string
): DateTimeComponents {
  const formattedInZone = formatInTimeZone(utcDate, timezone, 'yyyy-MM-dd HH:mm:ss')
  const [datePart, timePart] = formattedInZone.split(' ')
  const [y, m, d] = datePart.split('-').map(Number)
  const [hh, mm, ss] = timePart.split(':').map(Number)

  return {
    date: new Date(y, m - 1, d),
    hour: hh,
    minute: mm,
    second: ss,
    timezone
  }
}
