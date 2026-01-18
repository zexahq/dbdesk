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
  SelectValue
} from '@renderer/components/ui/select'
import { cn } from '@renderer/lib/utils'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import * as React from 'react'
import { COMMON_TIMEZONES } from '@common/constants'
import {
  getTimezoneLabel,
  parseAndValidateInput,
  extractComponentsFromUtc
} from '@renderer/lib/datetime-utils'

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

  const [isOpen, setIsOpen] = React.useState(false)
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    cellValue instanceof Date ? cellValue : cellValue ? new Date(String(cellValue)) : undefined
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
  const [selectedTimezone, setSelectedTimezone] = React.useState(currentTimezone)

  const hours = Array.from({ length: 24 }, (_, i) => i)
  const minutes = Array.from({ length: 60 }, (_, i) => i)
  const seconds = Array.from({ length: 60 }, (_, i) => i)

  // Input field state and validation
  const [inputValue, setInputValue] = React.useState('')
  const [inputError, setInputError] = React.useState<string | null>(null)

  // Determine if timezone-aware
  const isTimezoneAware = React.useMemo(() => {
    return (
      dataType?.includes('with time zone') ||
      dataType?.includes('tz') ||
      dataType === 'timestamptz' ||
      dataType === 'timetz'
    )
  }, [dataType])

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
          // For timezone-aware: convert wall-clock time in selected timezone to UTC instant
          const year = selectedDate.getFullYear()
          const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
          const day = String(selectedDate.getDate()).padStart(2, '0')
          const hours = String(selectedHour ?? 0).padStart(2, '0')
          const minutes = String(selectedMinute ?? 0).padStart(2, '0')
          const seconds = String(selectedSecond ?? 0).padStart(2, '0')

          // Build wall-clock time string in the selected timezone
          const wallClockTime = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`

          // Convert this wall-clock time in selectedTimezone to a proper UTC instant
          const utcInstant = fromZonedTime(wallClockTime, selectedTimezone)

          // Store as ISO string (UTC)
          valueString = utcInstant.toISOString()
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
    [cellValueString, props, rowIndex, columnId, restoreFocus, isTimezoneAware, selectedTimezone, selectedDate, selectedHour, selectedMinute, selectedSecond]
  )

  const handleSave = React.useCallback(() => {
    // Build a local Date from selected components for non-timezone-aware branch
    let dateTime: Date | undefined
    if (selectedDate) {
      const d = new Date(selectedDate)
      d.setHours(selectedHour ?? 0)
      d.setMinutes(selectedMinute ?? 0)
      d.setSeconds(selectedSecond ?? 0)
      dateTime = d
    }
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

    if (isEditing && !wasEditing) {
      // Treat the stored value as a UTC instant if present
      const utcDate: Date | undefined = cellValueString
        ? new Date(String(cellValueString))
        : cellValue instanceof Date
          ? cellValue
          : undefined

      if (utcDate && isTimezoneAware) {
        const components = extractComponentsFromUtc(utcDate, selectedTimezone)
        setSelectedDate(components.date)
        setSelectedHour(components.hour)
        setSelectedMinute(components.minute)
        setSelectedSecond(components.second)
        setInputValue(formatInTimeZone(utcDate, selectedTimezone, 'MM/dd/yyyy HH:mm:ssXXX'))
      } else if (utcDate) {
        // Non-timezone-aware: initialize from date directly
        setSelectedDate(utcDate)
        setSelectedHour(utcDate.getHours())
        setSelectedMinute(utcDate.getMinutes())
        setSelectedSecond(utcDate.getSeconds())
        setInputValue(formatInTimeZone(utcDate, selectedTimezone, 'MM/dd/yyyy HH:mm:ss'))
      } else {
        // No value: default today + 00:00:00
        const today = new Date()
        setSelectedDate(today)
        setSelectedHour(0)
        setSelectedMinute(0)
        setSelectedSecond(0)
        const wall = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
          today.getDate()
        ).padStart(2, '0')}T00:00:00`
        const utcInstant = fromZonedTime(wall, selectedTimezone)
        setInputValue(formatInTimeZone(utcInstant, selectedTimezone, 'MM/dd/yyyy HH:mm:ssXXX'))
      }

      setInputError(null)
      setIsOpen(true)
    }
  }, [isEditing, cellValue, cellValueString, isTimezoneAware, selectedTimezone])

  // Update input when date or time selectors change
  React.useEffect(() => {
    // Build wall-clock components and render input in selected timezone
    if (!selectedDate) return
    const y = selectedDate.getFullYear()
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0')
    const d = String(selectedDate.getDate()).padStart(2, '0')
    const hh = String((selectedHour ?? 0)).padStart(2, '0')
    const mm = String((selectedMinute ?? 0)).padStart(2, '0')
    const ss = String((selectedSecond ?? 0)).padStart(2, '0')

    const wall = `${y}-${m}-${d}T${hh}:${mm}:${ss}`
    const utcInstant = fromZonedTime(wall, selectedTimezone)
    setInputValue(
      isTimezoneAware
        ? formatInTimeZone(utcInstant, selectedTimezone, 'MM/dd/yyyy HH:mm:ssXXX')
        : formatInTimeZone(utcInstant, selectedTimezone, 'MM/dd/yyyy HH:mm:ss')
    )
    setInputError(null)
  }, [selectedDate, selectedHour, selectedMinute, selectedSecond, selectedTimezone, isTimezoneAware])

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
                          {getTimezoneLabel(selectedTimezone, currentTimezone)}
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
