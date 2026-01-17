"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

import { cn } from '@renderer/lib/utils'
import { Button } from "./button";
import { Calendar } from "./calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";
import { ScrollArea, ScrollBar } from "./scroll-area";

export function DateTimePicker() {
  const [selectedDate, setSelectedDate] = React.useState<Date>();
  const [selectedHour, setSelectedHour] = React.useState<number>();
  const [selectedMinute, setSelectedMinute] = React.useState<number>();
  const [isOpen, setIsOpen] = React.useState(false);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const buildDateTime = (date?: Date, hour?: number, minute?: number): Date | undefined => {
    if (date === undefined && hour === undefined && minute === undefined) {
      return undefined;
    }
    const baseDate = date ? new Date(date) : new Date();
    baseDate.setHours(hour ?? 0);
    baseDate.setMinutes(minute ?? 0);
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

  const displayDate = buildDateTime(selectedDate, selectedHour, selectedMinute);

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
            format(displayDate, "MM/dd/yyyy HH:mm")
          ) : (
            <span>MM/DD/YYYY HH:mm</span>
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
                {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
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
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export interface DateTimePickerFieldProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
}

export function DateTimePickerField({ value, onChange }: DateTimePickerFieldProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(value);
  const [selectedHour, setSelectedHour] = React.useState<number | undefined>(value?.getHours());
  const [selectedMinute, setSelectedMinute] = React.useState<number | undefined>(value?.getMinutes());
  const [isOpen, setIsOpen] = React.useState(false);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const buildDateTime = (date?: Date, hour?: number, minute?: number): Date | undefined => {
    if (date === undefined && hour === undefined && minute === undefined) {
      return undefined;
    }
    const baseDate = date ? new Date(date) : new Date();
    baseDate.setHours(hour ?? 0);
    baseDate.setMinutes(minute ?? 0);
    return baseDate;
  };

  const handleDateSelect = (newDate: Date | undefined) => {
    setSelectedDate(newDate);
    const result = buildDateTime(newDate, selectedHour, selectedMinute);
    onChange?.(result);
  };

  const handleHourSelect = (hour: number) => {
    setSelectedHour(hour);
    const result = buildDateTime(selectedDate, hour, selectedMinute);
    onChange?.(result);
  };

  const handleMinuteSelect = (minute: number) => {
    setSelectedMinute(minute);
    const result = buildDateTime(selectedDate, selectedHour, minute);
    onChange?.(result);
  };

  const displayDate = buildDateTime(selectedDate, selectedHour, selectedMinute);

  return (
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
            format(displayDate, "MM/dd/yyyy HH:mm")
          ) : (
            <span>MM/DD/YYYY HH:mm</span>
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
                {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
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
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
