"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

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

export function DateTimePicker() {
  const [selectedDate, setSelectedDate] = React.useState<Date>();
  const [selectedHour, setSelectedHour] = React.useState<number>();
  const [selectedMinute, setSelectedMinute] = React.useState<number>();
  const [selectedSecond, setSelectedSecond] = React.useState<number>();
  const [isOpen, setIsOpen] = React.useState(false);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const seconds = Array.from({ length: 60 }, (_, i) => i);

  const buildDateTime = (date?: Date, hour?: number, minute?: number, second?: number): Date | undefined => {
    if (date === undefined && hour === undefined && minute === undefined && second === undefined) {
      return undefined;
    }
    const baseDate = date ? new Date(date) : new Date();
    baseDate.setHours(hour ?? 0);
    baseDate.setMinutes(minute ?? 0);
    baseDate.setSeconds(second ?? 0);
    return baseDate;
  };

  const handleDateSelect = (newDate: Date | undefined) => {
    setSelectedDate(newDate);
  };

  const handleHourSelect = (hour: number) => {
    setSelectedHour(hour);
  };

  const handleMinuteSelect = (minute: number) => {
    setSelectedMinute(minute);
  };

  const handleSecondSelect = (second: number) => {
    setSelectedSecond(second);
  };

  const displayDate = buildDateTime(selectedDate, selectedHour, selectedMinute, selectedSecond);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !displayDate && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayDate ? (
            format(displayDate, "MM/dd/yyyy HH:mm:ss")
          ) : (
            <span>MM/DD/YYYY HH:mm:ss</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <div className="sm:flex">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
          />
          <div className="flex flex-col sm:flex-row sm:h-[300px] divide-y sm:divide-y-0 sm:divide-x">
            <ScrollArea className="w-64 sm:w-auto">
              <div className="flex sm:flex-col p-2">
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
            <ScrollArea className="w-64 sm:w-auto">
              <div className="flex sm:flex-col p-2">
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
            <ScrollArea className="w-64 sm:w-auto">
              <div className="flex sm:flex-col p-2">
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
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(value);
  const [selectedHour, setSelectedHour] = React.useState<number | undefined>(value?.getHours());
  const [selectedMinute, setSelectedMinute] = React.useState<number | undefined>(value?.getMinutes());
  const [selectedSecond, setSelectedSecond] = React.useState<number | undefined>(value?.getSeconds());
  const [selectedTimezone, setSelectedTimezone] = React.useState<string>(timezone);
  const [isOpen, setIsOpen] = React.useState(false);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const seconds = Array.from({ length: 60 }, (_, i) => i);

  const buildDateTime = (date?: Date, hour?: number, minute?: number, second?: number): Date | undefined => {
    if (date === undefined && hour === undefined && minute === undefined && second === undefined) {
      return undefined;
    }
    const baseDate = date ? new Date(date) : new Date();
    baseDate.setHours(hour ?? 0);
    baseDate.setMinutes(minute ?? 0);
    baseDate.setSeconds(second ?? 0);
    return baseDate;
  };

  const handleDateSelect = (newDate: Date | undefined) => {
    setSelectedDate(newDate);
    const result = buildDateTime(newDate, selectedHour, selectedMinute, selectedSecond);
    onChange?.(result);
  };

  const handleHourSelect = (hour: number) => {
    setSelectedHour(hour);
    const result = buildDateTime(selectedDate, hour, selectedMinute, selectedSecond);
    onChange?.(result);
  };

  const handleMinuteSelect = (minute: number) => {
    setSelectedMinute(minute);
    const result = buildDateTime(selectedDate, selectedHour, minute, selectedSecond);
    onChange?.(result);
  };

  const handleSecondSelect = (second: number) => {
    setSelectedSecond(second);
    const result = buildDateTime(selectedDate, selectedHour, selectedMinute, second);
    onChange?.(result);
  };

  const handleTimezoneChange = (tz: string) => {
    setSelectedTimezone(tz);
    onTimezoneChange?.(tz);
  };

  const displayDate = buildDateTime(selectedDate, selectedHour, selectedMinute, selectedSecond);

  const formatDisplayDate = () => {
    if (!displayDate) return null;

    if (showTimezone) {
      try {
        return formatInTimeZone(displayDate, selectedTimezone, "MM/dd/yyyy HH:mm:ss zzz");
      } catch {
        return format(displayDate, "MM/dd/yyyy HH:mm:ss");
      }
    }
    return format(displayDate, "MM/dd/yyyy HH:mm:ss");
  };

  return (
    <div className="flex flex-col gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal h-9",
              !displayDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayDate ? (
              formatDisplayDate()
            ) : (
              <span>{showTimezone ? "MM/DD/YYYY HH:mm:ss" : "MM/DD/YYYY HH:mm:ss"}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <div className="sm:flex">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              initialFocus
            />
            <div className="flex flex-col sm:flex-row sm:h-[300px] divide-y sm:divide-y-0 sm:divide-x">
              <ScrollArea className="w-64 sm:w-auto">
                <div className="flex sm:flex-col p-2">
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
              <ScrollArea className="w-64 sm:w-auto">
                <div className="flex sm:flex-col p-2">
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
              <ScrollArea className="w-64 sm:w-auto">
                <div className="flex sm:flex-col p-2">
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
