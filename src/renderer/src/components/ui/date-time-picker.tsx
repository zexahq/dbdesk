"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

import { cn } from '@renderer/lib/utils'
import { COMMON_TIMEZONES } from '@common/constants'
import { Button } from "./button";
import { Calendar } from "./calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";
import { ScrollArea, ScrollBar } from "./scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { getTimezoneLabel, extractComponentsFromUtc } from '@renderer/lib/datetime-utils'

export function DateTimePicker() {
  const currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);
  const [selectedHour, setSelectedHour] = React.useState<number | undefined>(undefined);
  const [selectedMinute, setSelectedMinute] = React.useState<number | undefined>(undefined);
  const [selectedSecond, setSelectedSecond] = React.useState<number | undefined>(undefined);
  const [selectedTimezone, setSelectedTimezone] = React.useState<string>(currentTimezone);
  const [isOpen, setIsOpen] = React.useState(false);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const seconds = Array.from({ length: 60 }, (_, i) => i);

  const getDisplayString = (): string | null => {
    if (!selectedDate) return null
    const y = selectedDate.getFullYear()
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0')
    const d = String(selectedDate.getDate()).padStart(2, '0')
    const hh = String((selectedHour ?? 0)).padStart(2, '0')
    const mm = String((selectedMinute ?? 0)).padStart(2, '0')
    const ss = String((selectedSecond ?? 0)).padStart(2, '0')
    const wall = `${y}-${m}-${d}T${hh}:${mm}:${ss}`
    const utc = fromZonedTime(wall, selectedTimezone)
    return formatInTimeZone(utc, selectedTimezone, 'MM/dd/yyyy HH:mm:ssXXX')
  }

  const displayString = getDisplayString();

  const handleDateSelect = (newDate: Date | undefined) => {
    setSelectedDate(newDate);
  };
  const handleHourSelect = (hour: number) => setSelectedHour(hour);
  const handleMinuteSelect = (minute: number) => setSelectedMinute(minute);
  const handleSecondSelect = (second: number) => setSelectedSecond(second);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !displayString && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayString ? (
            displayString
          ) : (
            <span>MM/DD/YYYY HH:mm:ss</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-2 border-b">
          <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
            <SelectTrigger className="h-fit text-xs w-[150px]">
              <SelectValue placeholder="Select timezone">
                {getTimezoneLabel(selectedTimezone, currentTimezone)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className='max-h-[300px] pt-0'>
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
        <div className="sm:flex overflow-hidden flex-1">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
            className="h-auto shrink-0"
          />
          <div className="flex flex-col sm:flex-row sm:h-[280px] divide-y sm:divide-y-0 sm:divide-x overflow-hidden flex-1 min-w-0">
            <div className="flex flex-col flex-1 min-w-0 basis-1/3 relative">
              <div className="text-xs text-muted-foreground px-2 py-1 font-medium shrink-0">Hour</div>
              <ScrollArea className="flex-1 w-full h-full">
                <div className="flex sm:flex-col p-2 pb-0">
                  {hours.map((hour) => (
                    <Button
                      key={hour}
                      size="icon"
                      variant={
                        selectedHour === hour
                          ? "default"
                          : "ghost"
                      }
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
            <div className="flex flex-col flex-1 min-w-0 basis-1/3 relative">
              <div className="text-xs text-muted-foreground px-2 py-1 font-medium shrink-0">Minute</div>
              <ScrollArea className="flex-1 w-full h-full">
                <div className="flex sm:flex-col p-2 pb-0">
                  {minutes.map((minute) => (
                    <Button
                      key={minute}
                      size="icon"
                      variant={
                        selectedMinute === minute
                          ? "default"
                          : "ghost"
                      }
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
            <div className="flex flex-col flex-1 min-w-0 basis-1/3 relative">
              <div className="text-xs text-muted-foreground px-2 py-1 font-medium shrink-0">Second</div>
              <ScrollArea className="flex-1 w-full h-full">
                <div className="flex sm:flex-col p-2 pb-0">
                  {seconds.map((second) => (
                    <Button
                      key={second}
                      size="icon"
                      variant={
                        selectedSecond === second
                          ? "default"
                          : "ghost"
                      }
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
      </PopoverContent>
    </Popover>
  );
}

export interface DateTimePickerFieldProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  showTimezone?: boolean;
  timezone?: string;
  onTimezoneChange?: (timezone: string) => void;
}

export function DateTimePickerField({
  value,
  onChange,
  showTimezone = false,
  timezone = 'UTC',
  onTimezoneChange
}: DateTimePickerFieldProps) {
  const currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [selectedTimezone, setSelectedTimezone] = React.useState<string>(timezone || currentTimezone);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);
  const [selectedHour, setSelectedHour] = React.useState<number | undefined>(undefined);
  const [selectedMinute, setSelectedMinute] = React.useState<number | undefined>(undefined);
  const [selectedSecond, setSelectedSecond] = React.useState<number | undefined>(undefined);
  const [isOpen, setIsOpen] = React.useState(false);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const seconds = Array.from({ length: 60 }, (_, i) => i);

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
  }, [value, selectedTimezone]);

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
  };

  const handleDateSelect = (newDate: Date | undefined) => {
    setSelectedDate(newDate);
    const utc = toUtcInstant(newDate, selectedHour, selectedMinute, selectedSecond)
    onChange?.(utc);
  };

  const handleHourSelect = (hour: number) => {
    setSelectedHour(hour);
    const utc = toUtcInstant(selectedDate, hour, selectedMinute, selectedSecond)
    onChange?.(utc);
  };

  const handleMinuteSelect = (minute: number) => {
    setSelectedMinute(minute);
    const utc = toUtcInstant(selectedDate, selectedHour, minute, selectedSecond)
    onChange?.(utc);
  };

  const handleSecondSelect = (second: number) => {
    setSelectedSecond(second);
    const utc = toUtcInstant(selectedDate, selectedHour, selectedMinute, second)
    onChange?.(utc);
  };

  const handleTimezoneChange = (tz: string) => {
    setSelectedTimezone(tz);
    onTimezoneChange?.(tz);
    const utc = toUtcInstant(selectedDate, selectedHour, selectedMinute, selectedSecond)
    onChange?.(utc)
  };

  const formatDisplayDate = () => {
    if (!selectedDate) return null
    const y = selectedDate.getFullYear()
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0')
    const d = String(selectedDate.getDate()).padStart(2, '0')
    const hh = String((selectedHour ?? 0)).padStart(2, '0')
    const mm = String((selectedMinute ?? 0)).padStart(2, '0')
    const ss = String((selectedSecond ?? 0)).padStart(2, '0')
    const wall = `${y}-${m}-${d}T${hh}:${mm}:${ss}`
    const utc = fromZonedTime(wall, selectedTimezone)
    return showTimezone
      ? formatInTimeZone(utc, selectedTimezone, "MM/dd/yyyy HH:mm:ssXXX")
      : formatInTimeZone(utc, selectedTimezone, "MM/dd/yyyy HH:mm:ss")
  }

  return (
    <div className="flex flex-col gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal h-9",
              !selectedDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate ? (
              formatDisplayDate()
            ) : (
              <span>{showTimezone ? "MM/DD/YYYY HH:mm:ss" : "MM/DD/YYYY HH:mm:ss"}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 max-h-[80vh] overflow-hidden flex flex-col">
          <div className="sm:flex overflow-hidden flex-1">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              initialFocus
              className="h-auto shrink-0"
            />
            <div className="flex flex-col sm:flex-row sm:h-[280px] divide-y sm:divide-y-0 sm:divide-x overflow-hidden flex-1 min-w-0">
              <div className="flex flex-col flex-1 min-w-0 basis-1/3 relative">
                <div className="text-xs text-muted-foreground px-2 py-1 font-medium shrink-0">Hour</div>
                <ScrollArea className="flex-1 w-full h-full">
                  <div className="flex sm:flex-col p-2 pb-12">
                    {hours.map((hour) => (
                      <Button
                        key={hour}
                        size="icon"
                        variant={
                          selectedHour === hour
                            ? "default"
                            : "ghost"
                        }
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
              <div className="flex flex-col flex-1 min-w-0 basis-1/3 relative">
                <div className="text-xs text-muted-foreground px-2 py-1 font-medium shrink-0">Minute</div>
                <ScrollArea className="flex-1 w-full h-full">
                  <div className="flex sm:flex-col p-2 pb-12">
                    {minutes.map((minute) => (
                      <Button
                        key={minute}
                        size="icon"
                        variant={
                          selectedMinute === minute
                            ? "default"
                            : "ghost"
                        }
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
              <div className="flex flex-col flex-1 min-w-0 basis-1/3 relative">
                <div className="text-xs text-muted-foreground px-2 py-1 font-medium shrink-0">Second</div>
                <ScrollArea className="flex-1 w-full h-full">
                  <div className="flex sm:flex-col p-2 pb-12">
                    {seconds.map((second) => (
                      <Button
                        key={second}
                        size="icon"
                        variant={
                          selectedSecond === second
                            ? "default"
                            : "ghost"
                        }
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
        </PopoverContent>
      </Popover>
      {showTimezone && (
        <Select value={selectedTimezone} onValueChange={handleTimezoneChange}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select timezone" />
          </SelectTrigger>
          <SelectContent>
            {COMMON_TIMEZONES.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>
                {tz.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
