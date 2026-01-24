'use client'

import * as React from 'react'
import { CalendarIcon } from 'lucide-react'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'

import { cn } from '@renderer/lib/utils'
import { COMMON_TIMEZONES } from '@common/constants'
import { Button } from './button'
import { Calendar } from './calendar'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { ScrollArea } from './scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
import { getTimezoneLabel, extractComponentsFromUtc } from '@renderer/lib/datetime-utils'

export interface UseDateTimePickerProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  showTimezone?: boolean
}

export function useDateTimePicker({
  value,
  onChange,
  showTimezone = false
}: UseDateTimePickerProps) {
  const currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const [selectedTimezone, setSelectedTimezone] = React.useState<string>(
    showTimezone ? currentTimezone : 'UTC'
  )
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined)
  const [selectedHour, setSelectedHour] = React.useState<number | undefined>(undefined)
  const [selectedMinute, setSelectedMinute] = React.useState<number | undefined>(undefined)
  const [selectedSecond, setSelectedSecond] = React.useState<number | undefined>(undefined)

  const hours = Array.from({ length: 24 }, (_, i) => i)
  const minutes = Array.from({ length: 60 }, (_, i) => i)
  const seconds = Array.from({ length: 60 }, (_, i) => i)

  React.useEffect(() => {
    if (value) {
      const components = extractComponentsFromUtc(value, selectedTimezone)
      setSelectedDate(components.date)
      setSelectedHour(components.hour)
      setSelectedMinute(components.minute)
      setSelectedSecond(components.second)
    } else {
      const today = new Date()
      setSelectedDate(today)
      setSelectedHour(0)
      setSelectedMinute(0)
      setSelectedSecond(0)
    }
  }, [value])

  const toUtcInstant = React.useCallback(
    (date?: Date, hour?: number, minute?: number, second?: number): Date | undefined => {
      if (!date) return undefined
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      const hh = String(hour ?? 0).padStart(2, '0')
      const mm = String(minute ?? 0).padStart(2, '0')
      const ss = String(second ?? 0).padStart(2, '0')
      const wall = `${y}-${m}-${d}T${hh}:${mm}:${ss}`
      return fromZonedTime(wall, selectedTimezone)
    },
    [selectedTimezone]
  )

  const emitChange = React.useCallback(
    (date?: Date, hour?: number, minute?: number, second?: number) => {
      const utc = toUtcInstant(date, hour, minute, second)
      onChange?.(utc)
    },
    [toUtcInstant, onChange]
  )

  const handleDateSelect = React.useCallback(
    (newDate: Date | undefined) => {
      setSelectedDate(newDate)
      emitChange(newDate, selectedHour, selectedMinute, selectedSecond)
    },
    [emitChange, selectedHour, selectedMinute, selectedSecond]
  )

  const handleHourSelect = React.useCallback(
    (hour: number) => {
      setSelectedHour(hour)
      emitChange(selectedDate, hour, selectedMinute, selectedSecond)
    },
    [emitChange, selectedDate, selectedMinute, selectedSecond]
  )

  const handleMinuteSelect = React.useCallback(
    (minute: number) => {
      setSelectedMinute(minute)
      emitChange(selectedDate, selectedHour, minute, selectedSecond)
    },
    [emitChange, selectedDate, selectedHour, selectedSecond]
  )

  const handleSecondSelect = React.useCallback(
    (second: number) => {
      setSelectedSecond(second)
      emitChange(selectedDate, selectedHour, selectedMinute, second)
    },
    [emitChange, selectedDate, selectedHour, selectedMinute]
  )

  const handleTimezoneChange = React.useCallback(
    (tz: string) => {
      setSelectedTimezone(tz)
    },
    []
  )

  const handleNow = React.useCallback(() => {
    const now = new Date()
    setSelectedDate(now)
    setSelectedHour(now.getHours())
    setSelectedMinute(now.getMinutes())
    setSelectedSecond(now.getSeconds())
    emitChange(now, now.getHours(), now.getMinutes(), now.getSeconds())
  }, [emitChange])

  const displayValue = React.useMemo(() => {
    if (!selectedDate) return ''
    const y = selectedDate.getFullYear()
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0')
    const d = String(selectedDate.getDate()).padStart(2, '0')
    const hh = String(selectedHour ?? 0).padStart(2, '0')
    const mm = String(selectedMinute ?? 0).padStart(2, '0')
    const ss = String(selectedSecond ?? 0).padStart(2, '0')
    const wall = `${y}-${m}-${d}T${hh}:${mm}:${ss}`
    const utc = fromZonedTime(wall, selectedTimezone)
    return showTimezone
      ? formatInTimeZone(utc, selectedTimezone, 'MM/dd/yyyy HH:mm:ssXXX')
      : formatInTimeZone(utc, selectedTimezone, 'MM/dd/yyyy HH:mm:ss')
  }, [selectedDate, selectedHour, selectedMinute, selectedSecond, selectedTimezone, showTimezone])

  return {
    currentTimezone,
    selectedTimezone,
    selectedDate,
    selectedHour,
    selectedMinute,
    selectedSecond,
    hours,
    minutes,
    seconds,
    displayValue,
    handleDateSelect,
    handleHourSelect,
    handleMinuteSelect,
    handleSecondSelect,
    handleTimezoneChange,
    handleNow
  }
}

export interface DateTimePickerContentProps {
  showTimezone?: boolean
  onSave?: () => void
  pickerState: ReturnType<typeof useDateTimePicker>
}

export function DateTimePickerContent({
  showTimezone = false,
  onSave,
  pickerState
}: DateTimePickerContentProps) {
  const {
    currentTimezone,
    selectedTimezone,
    selectedDate,
    selectedHour,
    selectedMinute,
    selectedSecond,
    hours,
    minutes,
    seconds,
    handleDateSelect,
    handleHourSelect,
    handleMinuteSelect,
    handleSecondSelect,
    handleTimezoneChange,
    handleNow
  } = pickerState

  return (
    <div className="w-[500px] p-0 h-[350px] overflow-hidden flex flex-col">
      <div className="sm:flex overflow-hidden flex-1 min-h-0">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          className="h-auto shrink-0"
        />

        <div className="flex flex-col overflow-hidden flex-1 min-w-0 h-full border-l">
          {showTimezone && (
            <div className="p-2 border-b">
              <Select value={selectedTimezone} onValueChange={handleTimezoneChange}>
                <SelectTrigger className="h-fit text-xs w-full ring-0 border border-muted p-2.5! focus:border-muted! focus:ring-0 focus-visible:ring-0">
                  <SelectValue placeholder="Select timezone">
                    {getTimezoneLabel(selectedTimezone, currentTimezone)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[300px] pt-0">
                  <SelectItem
                    value={currentTimezone}
                    className="sticky -top-1 bg-background z-10 pt-2 rounded-none"
                  >
                    <div>
                      <div>Current Timezone</div>
                      <div className="text-[10px] text-left text-muted-foreground">
                        {currentTimezone}
                      </div>
                    </div>
                  </SelectItem>
                  <div className="h-px bg-border my-1" />
                  {COMMON_TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      <div>
                        <div>{tz.label}</div>
                        <div className="text-[10px] text-left text-muted-foreground">
                          {tz.value}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:divide-y-0 sm:divide-x overflow-hidden flex-1 min-w-0 pt-2">
            <div className="relative flex flex-col flex-1 min-w-0 basis-1/3">
              <div className="text-xs text-center text-muted-foreground px-2 py-1 font-medium shrink-0">
                Hour
              </div>
              <ScrollArea hideScrollBar className="flex-1 w-full h-full pb-4">
                <div className="flex sm:flex-col p-2 pb-6">
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
              </ScrollArea>
            </div>

            <div className="relative flex flex-col flex-1 min-w-0 basis-1/3">
              <div className="text-xs text-center text-muted-foreground px-2 py-1 font-medium shrink-0">
                Minute
              </div>
              <ScrollArea hideScrollBar className="flex-1 w-full h-full pb-4">
                <div className="flex sm:flex-col p-2 pb-6">
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
              </ScrollArea>
            </div>

            <div className="relative flex flex-col flex-1 min-w-0 basis-1/3">
              <div className="text-xs text-center text-muted-foreground px-2 py-1 font-medium shrink-0">
                Second
              </div>
              <ScrollArea hideScrollBar className="flex-1 w-full h-full pb-4">
                <div className="flex sm:flex-col p-2 pb-6">
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
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>

      <div className="p-2 border-t flex justify-between">
        <Button size="sm" variant="outline" onClick={handleNow} className="h-7 text-xs min-w-24">
          Now
        </Button>
        {onSave && (
          <Button size="sm" onClick={onSave} className="h-7 text-xs min-w-24">
            Save
          </Button>
        )}
      </div>
    </div>
  )
}

export interface DateTimePickerFieldProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  showTimezone?: boolean
}

export function DateTimePickerField({
  value,
  onChange,
  showTimezone = false
}: DateTimePickerFieldProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const pickerState = useDateTimePicker({ value, onChange, showTimezone })

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal h-9',
            !pickerState.selectedDate && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {pickerState.selectedDate
            ? pickerState.displayValue
            : showTimezone
              ? 'MM/DD/YYYY HH:mm:ss+XX:XX'
              : 'MM/DD/YYYY HH:mm:ss'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <DateTimePickerContent
          showTimezone={showTimezone}
          onSave={() => setIsOpen(false)}
          pickerState={pickerState}
        />
      </PopoverContent>
    </Popover>
  )
}
