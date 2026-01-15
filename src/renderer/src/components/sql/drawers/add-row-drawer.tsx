import type { ColumnInfo } from '@common/types'
import { Button } from '@renderer/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@renderer/components/ui/sheet'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@renderer/components/ui/popover'
import { cn } from '@renderer/lib/utils'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

interface AddRowDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  columns: ColumnInfo[]
  onSubmit: (values: Record<string, unknown>) => void
  isPending?: boolean
}

export function AddRowDialog({
  open,
  onOpenChange,
  columns,
  onSubmit,
  isPending
}: AddRowDialogProps) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [isScrollable, setIsScrollable] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Convert values to appropriate types
    const processedValues: Record<string, unknown> = {}
    for (const column of columns) {
      const value = values[column.name]

      // Skip auto-generated columns
      if (column.defaultValue?.toString().includes('IDENTITY') || column.defaultValue?.toString().includes('SERIAL')) {
        continue
      }

      // Handle empty values
      if (value === '' || value === undefined) {
        processedValues[column.name] = column.nullable ? null : ''
        continue
      }

      // Type conversion based on column type
      const type = column.type.toLowerCase()
      try {
        if (type.includes('int') || type.includes('serial')) {
          const num = parseInt(value, 10)
          if (isNaN(num)) {
            throw new Error(`Invalid integer value for ${column.name}`)
          }
          processedValues[column.name] = num
        } else if (type.includes('float') || type.includes('double') || type.includes('numeric') || type.includes('decimal')) {
          const num = parseFloat(value)
          if (isNaN(num)) {
            throw new Error(`Invalid numeric value for ${column.name}`)
          }
          processedValues[column.name] = num
        } else if (type.includes('bool') || type.includes('boolean')) {
          processedValues[column.name] = value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === 'yes'
        } else if (type.includes('timestamp') || type.includes('datetime') || type.includes('date')) {
          // For timestamp/date fields, convert to ISO string
          const date = new Date(value)
          if (isNaN(date.getTime())) {
            throw new Error(`Invalid date value for ${column.name}`)
          }
          processedValues[column.name] = date.toISOString()
        } else if (type.includes('json')) {
          // For JSON fields, try to parse as JSON
          try {
            processedValues[column.name] = JSON.parse(value)
          } catch {
            // If not valid JSON, store as string
            processedValues[column.name] = value
          }
        } else {
          processedValues[column.name] = value
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        throw new Error(`Error processing ${column.name}: ${errorMsg}`)
      }
    }

    onSubmit(processedValues)
  }

  const handleValueChange = (columnName: string, value: string) => {
    setValues((prev) => ({ ...prev, [columnName]: value }))
  }

  useEffect(() => {
    const checkScrollable = () => {
      if (scrollContainerRef.current) {
        const { scrollHeight, clientHeight } = scrollContainerRef.current
        setIsScrollable(scrollHeight > clientHeight)
      }
    }

    checkScrollable()
    // Recheck when columns change or drawer opens
    const timer = setTimeout(checkScrollable, 100)
    return () => clearTimeout(timer)
  }, [columns, open])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto [&>button]:hidden">
        <SheetHeader className="pb-4">
          <SheetTitle>Add New Row</SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground opacity-50">
            Fill in the values for the new row
          </SheetDescription>
          <div className="w-3/4 border-t border-border" />
        </SheetHeader>

        <div className="flex flex-col gap-6 pb-4 px-6">
          <div className="flex flex-col gap-3">
            <Label className="text-sm font-medium">Row Data</Label>

            <div className="relative">
              <div ref={scrollContainerRef} className="flex flex-col gap-4 max-h-[calc(100vh-20rem)] overflow-y-auto pr-2 pb-6">
                {columns
                  .filter((column) => column.name !== 'id')
                  .map((column) => {
              const isAutoGenerated =
                column.defaultValue?.toString().includes('IDENTITY') || column.defaultValue?.toString().includes('SERIAL')
              const isTimestamp = column.type.toLowerCase().includes('timestamp') ||
                                 column.type.toLowerCase().includes('datetime')

              return (
                <div key={column.name} className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-3">
                  <Label htmlFor={column.name} className="text-sm font-medium">
                    {column.name}
                    {!column.nullable && !isAutoGenerated && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </Label>
                  <div className="flex flex-col gap-2">
                    {isAutoGenerated ? (
                      <Input
                        id={column.name}
                        value="Auto-generated"
                        disabled
                        className="bg-muted h-9 transition-all border-border focus:border-white! focus-visible:border-white! focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:ring-offset-0"
                      />
                    ) : isTimestamp ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full justify-start text-left font-normal h-9',
                              !values[column.name] && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {values[column.name] ? (
                              format(new Date(values[column.name]), 'PPP HH:mm')
                            ) : (
                              <span>Pick a date and time</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-4" align="start">
                          <Input
                            type="datetime-local"
                            value={values[column.name] || ''}
                            onChange={(e) => handleValueChange(column.name, e.target.value)}
                            className="w-full transition-all border-border focus:border-white! focus-visible:border-white! focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:ring-offset-0"
                          />
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const now = new Date()
                                const localDateTime = format(now, "yyyy-MM-dd'T'HH:mm")
                                handleValueChange(column.name, localDateTime)
                              }}
                              className="flex-1"
                            >
                              Now
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleValueChange(column.name, '')}
                              className="flex-1"
                            >
                              Clear
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <Input
                        id={column.name}
                        value={values[column.name] || ''}
                        onChange={(e) => handleValueChange(column.name, e.target.value)}
                        placeholder={
                          column.nullable
                            ? `${column.type} (nullable)`
                            : `${column.type} (required)`
                        }
                        required={!column.nullable}
                        className="h-9 transition-all border-border focus:border-white! focus-visible:border-white! focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:ring-offset-0"
                      />
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {`Type: ${column.type}${column.defaultValue ? ` | Default: ${String(column.defaultValue)}` : ''}`}
                    </p>
                  </div>
                </div>
              )
              })}
              </div>
              {/* Fade out overlay at the bottom - only shown when content is scrollable */}
              {isScrollable && (
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-linear-to-t from-background to-transparent pointer-events-none" />
              )}
            </div>
          </div>
        </div>

        <SheetFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="h-9"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending} onClick={handleSubmit} className="h-9">
            {isPending ? 'Adding...' : 'Add Row'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
