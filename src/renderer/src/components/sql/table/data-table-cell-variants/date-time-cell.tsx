'use client'

import { TableCell } from '@renderer/components/ui/table'
import { Button } from '@renderer/components/ui/button'
import { Calendar } from '@renderer/components/ui/calendar'
import { Input } from '@renderer/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@renderer/components/ui/popover'
import { ScrollArea, ScrollBar } from '@renderer/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select'
import { cn } from '@renderer/lib/utils'
import { format } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import * as React from 'react'
import { COMMON_TIMEZONES } from '@common/constants'

import type { DataTableCellProps } from '../data-table-cell.types'
import { areCellPropsEqual, useDataTableCellContext } from './base'

function DateTimeDataTableCellInner<TData, TValue>(props: DataTableCellProps<TData, TValue>) {
  const {
    tableCellProps,
    renderedCell,
    isEditing,
    rowIndex,
    columnId,
    tableContainerRef,
    cellValueString,
    cellValue,
    dataType
  } = useDataTableCellContext(props)

  // Get current timezone
  const currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  // Parse timezone from cellValueString
  const getTimezoneFromValue = React.useCallback((valueString: string): string => {
    if (!valueString) return 'UTC'

    // Match timezone offset pattern like +05:30, -05:00, or Z
    const offsetMatch = valueString.match(/([+-]\d{2}:\d{2}|Z)$/)
    if (!offsetMatch) return 'UTC'

    const offset = offsetMatch[1]
    if (offset === 'Z' || offset === '+00:00') return 'UTC'

    // Try to find a matching timezone from our list
    const testDate = new Date()

    // Check current timezone first
    const currentOffset = formatInTimeZone(testDate, currentTimezone, 'XXX')
    if (currentOffset === offset) return currentTimezone

    // Check common timezones
    for (const tz of COMMON_TIMEZONES) {
      const tzOffset = formatInTimeZone(testDate, tz.value, 'XXX')
      if (tzOffset === offset) return tz.value
    }

    return 'UTC'
  }, [currentTimezone])

  const [isOpen, setIsOpen] = React.useState(false)
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    cellValue instanceof Date ? cellValue : (cellValue ? new Date(String(cellValue)) : undefined)
  )
  const [selectedHour, setSelectedHour] = React.useState<number | undefined>(
    selectedDate?.getHours()
  )
  const [selectedMinute, setSelectedMinute] = React.useState<number | undefined>(
    selectedDate?.getMinutes()
  )
  const [selectedSecond, setSelectedSecond] = React.useState<number | undefined>(
    selectedDate?.getSeconds()
  )
  const [selectedTimezone, setSelectedTimezone] = React.useState(() => getTimezoneFromValue(cellValueString || ''))

  const hours = Array.from({ length: 24 }, (_, i) => i)
  const minutes = Array.from({ length: 60 }, (_, i) => i)
  const seconds = Array.from({ length: 60 }, (_, i) => i)

  // Input field state and validation
  const [inputValue, setInputValue] = React.useState('')
  const [inputError, setInputError] = React.useState<string | null>(null)

  // Determine if timezone-aware - move before functions that use it
  const isTimezoneAware = React.useMemo(() => {
    return (
      dataType?.includes('with time zone') ||
      dataType?.includes('tz') ||
      dataType === 'timestamptz' ||
      dataType === 'timetz'
    )
  }, [dataType])

  // Get timezone offset in format like +05:30 or -08:00
  const getTimezoneOffset = React.useCallback((date: Date, timezone: string): string => {
    try {
      const formatted = formatInTimeZone(date, timezone, 'XXX')
      return formatted
    } catch {
      return '+00:00'
    }
  }, [])

  // Get timezone label from value
  const getTimezoneLabel = React.useCallback((tzValue: string): string => {
    if (tzValue === currentTimezone) return 'Current Timezone'
    const tz = COMMON_TIMEZONES.find(t => t.value === tzValue)
    return tz?.label || tzValue
  }, [currentTimezone])

  // Format the display datetime
  const formatDisplayDateTime = React.useCallback((date?: Date, timezone?: string): string => {
    if (!date) return ''
    const dateTimeStr = format(date, 'MM/dd/yyyy HH:mm:ss')
    if (isTimezoneAware && timezone) {
      const offset = getTimezoneOffset(date, timezone)
      return `${dateTimeStr}${offset}`
    }
    return dateTimeStr
  }, [isTimezoneAware, getTimezoneOffset])

  // Parse and validate datetime input with stricter validation
  const parseAndValidateInput = React.useCallback((input: string): { valid: boolean; date?: Date; error?: string } => {
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
  }, [])

  const buildDateTime = (date?: Date, hour?: number, minute?: number, second?: number): Date | undefined => {
    if (date === undefined && hour === undefined && minute === undefined && second === undefined) {
      return undefined
    }
    const baseDate = date ? new Date(date) : new Date()
    baseDate.setHours(hour ?? 0)
    baseDate.setMinutes(minute ?? 0)
    baseDate.setSeconds(second ?? 0)
    return baseDate
  }

  const restoreFocus = React.useCallback(() => {
    setTimeout(() => {
      tableContainerRef.current?.focus()
    }, 0)
  }, [tableContainerRef])

  const commitValue = React.useCallback(
    (nextValue: Date | undefined) => {
      let valueString = ''

      if (nextValue && selectedDate) {
        if (isTimezoneAware) {
          // For timezone-aware: construct timestamp string directly with selected timezone offset
          const year = selectedDate.getFullYear()
          const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
          const day = String(selectedDate.getDate()).padStart(2, '0')
          const hours = String(selectedHour ?? 0).padStart(2, '0')
          const minutes = String(selectedMinute ?? 0).padStart(2, '0')
          const seconds = String(selectedSecond ?? 0).padStart(2, '0')

          // Create a date string and use it to get the offset for the selected timezone
          const dateStr = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
          // Create a Date object from the components (in local time) just for getting offset
          const referenceDate = new Date(year, parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes), parseInt(seconds))
          const offset = getTimezoneOffset(referenceDate, selectedTimezone)

          valueString = `${dateStr}.000${offset}`
        } else {
          // For non-timezone-aware: store as local time without timezone
          const year = nextValue.getFullYear()
          const month = String(nextValue.getMonth() + 1).padStart(2, '0')
          const day = String(nextValue.getDate()).padStart(2, '0')
          const hours = String(nextValue.getHours()).padStart(2, '0')
          const minutes = String(nextValue.getMinutes()).padStart(2, '0')
          const seconds = String(nextValue.getSeconds()).padStart(2, '0')
          const ms = String(nextValue.getMilliseconds()).padStart(3, '0')
          valueString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}`
        }
      }

      const hasChanged = valueString !== cellValueString

      if (hasChanged) {
        props.onDataUpdate({
          rowIndex,
          columnId,
          value: valueString === '' ? null : valueString
        })
      }

      setIsOpen(false)
      restoreFocus()
    },
    [cellValueString, props, rowIndex, columnId, restoreFocus, isTimezoneAware, selectedTimezone, selectedDate, selectedHour, selectedMinute, selectedSecond, getTimezoneOffset]
  )

  const handleSave = React.useCallback(() => {
    const dateTime = buildDateTime(selectedDate, selectedHour, selectedMinute, selectedSecond)
    commitValue(dateTime)
  }, [selectedDate, selectedHour, selectedMinute, selectedSecond, commitValue])

  const handleNow = React.useCallback(() => {
    const now = new Date()
    setSelectedDate(now)
    setSelectedHour(now.getHours())
    setSelectedMinute(now.getMinutes())
    setSelectedSecond(now.getSeconds())
  }, [])

  const handleCancel = React.useCallback(() => {
    setIsOpen(false)
    restoreFocus()
  }, [restoreFocus])

  // Track previous editing state to detect when editing starts
  const prevIsEditingRef = React.useRef(isEditing)

  // Reset popover state when editing starts (transition from false to true)
  React.useEffect(() => {
    const wasEditing = prevIsEditingRef.current
    prevIsEditingRef.current = isEditing

    // Only run when transitioning from not-editing to editing
    if (isEditing && !wasEditing) {
      const parsedDate = cellValue instanceof Date ? cellValue : (cellValue ? new Date(String(cellValue)) : undefined)
      const detectedTimezone = getTimezoneFromValue(cellValueString || '')

      setSelectedDate(parsedDate)
      setSelectedHour(parsedDate?.getHours())
      setSelectedMinute(parsedDate?.getMinutes())
      setSelectedSecond(parsedDate?.getSeconds())
      setSelectedTimezone(detectedTimezone)
      setInputValue(formatDisplayDateTime(parsedDate, isTimezoneAware ? detectedTimezone : undefined))
      setInputError(null)
      setIsOpen(true)
    }
  }, [isEditing, cellValue, cellValueString, isTimezoneAware, formatDisplayDateTime, getTimezoneFromValue])

  // Update input when date or time selectors change
  React.useEffect(() => {
    const dateTime = buildDateTime(selectedDate, selectedHour, selectedMinute, selectedSecond)
    setInputValue(formatDisplayDateTime(dateTime, isTimezoneAware ? selectedTimezone : undefined))
    setInputError(null)
  }, [selectedDate, selectedHour, selectedMinute, selectedSecond, selectedTimezone, formatDisplayDateTime, isTimezoneAware])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)

    if (!value.trim()) {
      setInputError('Date/time is required')
      return
    }

    const result = parseAndValidateInput(value)
    if (result.valid && result.date) {
      setInputError(null)
      // Update selectors based on input
      setSelectedDate(result.date)
      setSelectedHour(result.date.getHours())
      setSelectedMinute(result.date.getMinutes())
      setSelectedSecond(result.date.getSeconds())
    } else {
      setInputError(result.error || 'Invalid date/time')
    }
  }

  return (
    <TableCell
      {...tableCellProps}
      className={cn(
        tableCellProps.className,
        isEditing ? 'cursor-text' : 'cursor-pointer'
      )}
    >
      {isEditing ? (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <button className="w-full text-left p-0 h-auto font-normal">
              {renderedCell}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-50">
            {/* Input field at top */}
            <div className="p-3 border-b">
              <Input
                value={inputValue}
                onChange={handleInputChange}
                placeholder={isTimezoneAware ? "MM/DD/YYYY HH:mm:ss+00:00" : "MM/DD/YYYY HH:mm:ss"}
                className={cn(
                  'h-8 text-xs border-border focus:border-white! focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:ring-offset-0',
                  inputError && 'border-red-500 focus:border-red-500'
                )}
              />
              {inputError && (
                <p className="text-xs text-red-500 mt-1">{inputError}</p>
              )}
            </div>

            <div className="sm:flex">
              {/* Calendar */}
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => setSelectedDate(date)}
                initialFocus
                className="h-[300px]"
              />

              {/* Time Pickers with Timezone at top */}
              <div className="flex flex-col">
                {/* Timezone Selector at top */}
                {isTimezoneAware && (
                  <div className="p-2 border-b">
                    <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
                      <SelectTrigger className="h-fit text-xs w-[150px] ring-0 border border-muted p-2.5! focus:border-muted! focus:ring-0 focus-visible:ring-0">
                        <SelectValue placeholder="Select timezone">
                          {getTimezoneLabel(selectedTimezone)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className='max-h-[300px] pt-0'>
                        {/* Current Timezone - Fixed at top */}
                        <SelectItem value={currentTimezone} className="sticky -top-1 bg-background z-10 pt-2 rounded-none">
                          <div>
                            <div>Current Timezone</div>
                            <div className="text-[10px] text-left text-muted-foreground">{currentTimezone}</div>
                          </div>
                        </SelectItem>
                        <div className="h-px bg-border my-1" />
                        {/* Scrollable list */}
                        {COMMON_TIMEZONES.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            <div>
                              <div>{tz.label}</div>
                              <div className="text-[10px] text-left text-muted-foreground">{tz.value}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Time Pickers */}
                <div className="flex flex-col sm:flex-row sm:divide-y-0 sm:divide-x">
                  <div className="relative">
                    <ScrollArea className="w-64 sm:w-auto sm:h-60">
                      <div className="flex sm:flex-col p-2">
                        {hours.map((hour) => (
                          <Button
                            key={hour}
                            size="icon"
                            variant={selectedHour === hour ? "default" : "ghost"}
                            className="sm:w-full shrink-0 aspect-square"
                            onClick={() => setSelectedHour(hour)}
                          >
                            {String(hour).padStart(2, '0')}
                          </Button>
                        ))}
                      </div>
                      <ScrollBar orientation="horizontal" className="sm:hidden" />
                    </ScrollArea>
                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-linear-to-t from-background to-transparent" />
                  </div>
                  <div className="relative">
                    <ScrollArea className="w-64 sm:w-auto sm:h-60">
                      <div className="flex sm:flex-col p-2">
                        {minutes.map((minute) => (
                          <Button
                            key={minute}
                            size="icon"
                            variant={selectedMinute === minute ? "default" : "ghost"}
                            className="sm:w-full shrink-0 aspect-square"
                            onClick={() => setSelectedMinute(minute)}
                          >
                            {String(minute).padStart(2, '0')}
                          </Button>
                        ))}
                      </div>
                      <ScrollBar orientation="horizontal" className="sm:hidden" />
                    </ScrollArea>
                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-linear-to-t from-background to-transparent" />
                  </div>
                  <div className="relative">
                    <ScrollArea className="w-64 sm:w-auto sm:h-60">
                      <div className="flex sm:flex-col p-2">
                        {seconds.map((second) => (
                          <Button
                            key={second}
                            size="icon"
                            variant={selectedSecond === second ? "default" : "ghost"}
                            className="sm:w-full shrink-0 aspect-square"
                            onClick={() => setSelectedSecond(second)}
                          >
                            {String(second).padStart(2, '0')}
                          </Button>
                        ))}
                      </div>
                      <ScrollBar orientation="horizontal" className="sm:hidden" />
                    </ScrollArea>
                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-linear-to-t from-background to-transparent" />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1 h-7 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleNow}
                  className="flex-1 h-7 text-xs"
                >
                  Now
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  className="flex-1 h-7 text-xs"
                >
                  Save
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        renderedCell
      )}
    </TableCell>
  )
}

export const DateTimeDataTableCell = React.memo(
  DateTimeDataTableCellInner,
  areCellPropsEqual
) as typeof DateTimeDataTableCellInner
