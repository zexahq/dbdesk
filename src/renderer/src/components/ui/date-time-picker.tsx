'use client'

import * as React from 'react'
import { CalendarIcon } from 'lucide-react'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'

import { cn } from '@renderer/lib/utils'
import { COMMON_TIMEZONES } from '@common/constants'
import { Button } from './button'
import { Calendar } from './calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './popover'
import { Input } from './input'
import { ScrollArea, ScrollBar } from './scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select'
import { getTimezoneLabel, extractComponentsFromUtc } from '@renderer/lib/datetime-utils'

export interface DateTimePickerFieldProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  showTimezone?: boolean
  timezone?: string
  onTimezoneChange?: (timezone: string) => void
}

export function DateTimePickerField({
  value,
  onChange,
  showTimezone = false,
  timezone = 'UTC',
  onTimezoneChange
}: DateTimePickerFieldProps) {
  const currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const [selectedTimezone, setSelectedTimezone] = React.useState<string>(timezone || currentTimezone)
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined)
  const [selectedHour, setSelectedHour] = React.useState<number | undefined>(undefined)
  const [selectedMinute, setSelectedMinute] = React.useState<number | undefined>(undefined)
  const [selectedSecond, setSelectedSecond] = React.useState<number | undefined>(undefined)
  const [isOpen, setIsOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState('')
  const [inputError, setInputError] = React.useState<string | null>(null)

  const hours = Array.from({ length: 24 }, (_, i) => i)
  const minutes = Array.from({ length: 60 }, (_, i) => i)
  const seconds = Array.from({ length: 60 }, (_, i) => i)

  // Initialize from value prop
  React.useEffect(() => {
    if (value) {
      const components = extractComponentsFromUtc(value, selectedTimezone)
      setSelectedDate(components.date)
      setSelectedHour(components.hour)
      setSelectedMinute(components.minute)
      setSelectedSecond(components.second)
      setInputValue(
        showTimezone
          ? formatInTimeZone(value, selectedTimezone, 'MM/dd/yyyy HH:mm:ssXXX')
          : formatInTimeZone(value, selectedTimezone, 'MM/dd/yyyy HH:mm:ss')
      )
    } else {
      const today = new Date()
      setSelectedDate(today)
      setSelectedHour(0)
      setSelectedMinute(0)
      setSelectedSecond(0)
      setInputValue('')
    }
    setInputError(null)
  }, [value, selectedTimezone, showTimezone])

  const toUtcInstant = (date?: Date, hour?: number, minute?: number, second?: number): Date | undefined => {
    if (!date) return undefined
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const hh = String((hour ?? 0)).padStart(2, '0')
    const mm = String((minute ?? 0)).padStart(2, '0')
    const ss = String((second ?? 0)).padStart(2, '0')
    const wall = `${y}-${m}-${d}T${hh}:${mm}:${ss}`
    return fromZonedTime(wall, selectedTimezone)
  }

  const emitChange = (date?: Date, hour?: number, minute?: number, second?: number) => {
    const utc = toUtcInstant(date, hour, minute, second)
    onChange?.(utc)
  }

  const handleDateSelect = (newDate: Date | undefined) => {
    setSelectedDate(newDate)
    emitChange(newDate, selectedHour, selectedMinute, selectedSecond)
  }

  const handleHourSelect = (hour: number) => {
    setSelectedHour(hour)
    emitChange(selectedDate, hour, selectedMinute, selectedSecond)
  }

  const handleMinuteSelect = (minute: number) => {
    setSelectedMinute(minute)
    emitChange(selectedDate, selectedHour, minute, selectedSecond)
  }

  const handleSecondSelect = (second: number) => {
    setSelectedSecond(second)
    emitChange(selectedDate, selectedHour, selectedMinute, second)
  }

  const handleTimezoneChange = (tz: string) => {
    setSelectedTimezone(tz)
    onTimezoneChange?.(tz)
    emitChange(selectedDate, selectedHour, selectedMinute, selectedSecond)
  }

  const handleNow = () => {
    const now = new Date()
    setSelectedDate(now)
    setSelectedHour(now.getHours())
    setSelectedMinute(now.getMinutes())
    setSelectedSecond(now.getSeconds())
    emitChange(now, now.getHours(), now.getMinutes(), now.getSeconds())
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInputValue(val)

    if (!val.trim()) {
      setInputError(null)
      return
    }

    // Simple validation: try to parse as date
    const parsed = new Date(val)
    if (isNaN(parsed.getTime())) {
      setInputError('Invalid date/time')
      return
    }

    setInputError(null)
    const components = extractComponentsFromUtc(parsed, selectedTimezone)
    setSelectedDate(components.date)
    setSelectedHour(components.hour)
    setSelectedMinute(components.minute)
    setSelectedSecond(components.second)
    onChange?.(parsed)
  }

  const displayValue = React.useMemo(() => {
    if (!selectedDate) return ''
    const y = selectedDate.getFullYear()
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0')
    const d = String(selectedDate.getDate()).padStart(2, '0')
    const hh = String((selectedHour ?? 0)).padStart(2, '0')
    const mm = String((selectedMinute ?? 0)).padStart(2, '0')
    const ss = String((selectedSecond ?? 0)).padStart(2, '0')
    const wall = `${y}-${m}-${d}T${hh}:${mm}:${ss}`
    const utc = fromZonedTime(wall, selectedTimezone)
    return showTimezone
      ? formatInTimeZone(utc, selectedTimezone, 'MM/dd/yyyy HH:mm:ssXXX')
      : formatInTimeZone(utc, selectedTimezone, 'MM/dd/yyyy HH:mm:ss')
  }, [selectedDate, selectedHour, selectedMinute, selectedSecond, selectedTimezone, showTimezone])

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal h-9',
            !selectedDate && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? displayValue : (showTimezone ? 'MM/DD/YYYY HH:mm:ss+XX:XX' : 'MM/DD/YYYY HH:mm:ss')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 max-h-[600px] overflow-hidden flex flex-col z-50">
        {/* Input field at top */}
        <div className="p-3 border-b">
          <Input
            value={inputValue}
            onChange={handleInputChange}
            placeholder={showTimezone ? 'MM/DD/YYYY HH:mm:ss+00:00' : 'MM/DD/YYYY HH:mm:ss'}
            className={cn(
              'h-8 text-xs border-border focus:border-white! focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:ring-offset-0',
              inputError && 'border-red-500 focus:border-red-500'
            )}
          />
          {inputError && (
            <p className="text-xs text-red-500 mt-1">{inputError}</p>
          )}
        </div>

        <div className="sm:flex overflow-hidden flex-1 min-h-0">
          {/* Calendar */}
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
            className="h-auto shrink-0"
          />

          {/* Time Pickers */}
          <div className="flex flex-col overflow-hidden flex-1 min-w-0 sm:h-[280px]">
            {/* Timezone at top of time pickers */}
            {showTimezone && (
              <div className="p-2 border-b">
                <Select value={selectedTimezone} onValueChange={handleTimezoneChange}>
                  <SelectTrigger className="h-fit text-xs w-[150px] ring-0 border border-muted p-2.5! focus:border-muted! focus:ring-0 focus-visible:ring-0">
                    <SelectValue placeholder="Select timezone">
                      {getTimezoneLabel(selectedTimezone, currentTimezone)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] pt-0">
                    <SelectItem value={currentTimezone} className="sticky -top-1 bg-background z-10 pt-2 rounded-none">
                      <div>
                        <div>Current Timezone</div>
                        <div className="text-[10px] text-left text-muted-foreground">{currentTimezone}</div>
                      </div>
                    </SelectItem>
                    <div className="h-px bg-border my-1" />
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

            {/* Hour, Minute, Second columns */}
            <div className="flex flex-col sm:flex-row sm:divide-y-0 sm:divide-x overflow-hidden flex-1 min-w-0">
              {/* Hour */}
              <div className="relative flex flex-col flex-1 min-w-0 basis-1/3">
                <div className="text-xs text-muted-foreground px-2 py-1 font-medium shrink-0">Hour</div>
                <ScrollArea className="flex-1 w-full h-full">
                  <div className="flex sm:flex-col p-2 pb-12">
                    {hours.map((hour) => (
                      <Button
                        key={hour}
                        size="icon"
                        variant={selectedHour === hour ? 'default' : 'ghost'}
                        className="sm:w-full shrink-0 aspect-square"
                        onClick={() => handleHourSelect(hour)}
                      >
                        {String(hour).padStart(2, '0')}
                      </Button>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" className="sm:hidden" />
                </ScrollArea>
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-linear-to-t from-background to-transparent" />
              </div>

              {/* Minute */}
              <div className="relative flex flex-col flex-1 min-w-0 basis-1/3">
                <div className="text-xs text-muted-foreground px-2 py-1 font-medium shrink-0">Minute</div>
                <ScrollArea className="flex-1 w-full h-full">
                  <div className="flex sm:flex-col p-2 pb-12">
                    {minutes.map((minute) => (
                      <Button
                        key={minute}
                        size="icon"
                        variant={selectedMinute === minute ? 'default' : 'ghost'}
                        className="sm:w-full shrink-0 aspect-square"
                        onClick={() => handleMinuteSelect(minute)}
                      >
                        {String(minute).padStart(2, '0')}
                      </Button>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" className="sm:hidden" />
                </ScrollArea>
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-linear-to-t from-background to-transparent" />
              </div>

              {/* Second */}
              <div className="relative flex flex-col flex-1 min-w-0 basis-1/3">
                <div className="text-xs text-muted-foreground px-2 py-1 font-medium shrink-0">Second</div>
                <ScrollArea className="flex-1 w-full h-full">
                  <div className="flex sm:flex-col p-2 pb-12">
                    {seconds.map((second) => (
                      <Button
                        key={second}
                        size="icon"
                        variant={selectedSecond === second ? 'default' : 'ghost'}
                        className="sm:w-full shrink-0 aspect-square"
                        onClick={() => handleSecondSelect(second)}
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

        {/* Now Button */}
        <div className="p-4 border-t">
          <Button
            size="sm"
            onClick={handleNow}
            className="w-full h-7 text-xs"
          >
            Now
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
