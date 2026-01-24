import type { ColumnInfo } from '@common/types'
import { getCellVariant } from '@renderer/lib/data-table'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { Sheet, SheetContent, SheetFooter, SheetTitle } from '@renderer/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { useState } from 'react'
import { DateTimePickerField } from '@renderer/components/ui/date-time-picker'

interface AddRowDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  columns: ColumnInfo[]
  onSubmit: (values: Record<string, string | null>) => void
  isPending?: boolean
  tableName?: string
}

function TextInputField({
  column,
  value,
  onChange
}: {
  column: ColumnInfo
  value: string | null
  onChange: (value: string | null) => void
}) {
  return (
    <Input
      id={column.name}
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
      placeholder={
        column.defaultValue ? String(column.defaultValue) : column.nullable ? 'NULL' : ''
      }
      className="h-9 transition-all border-border focus:border-white! focus-visible:border-white! focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:ring-offset-0"
    />
  )
}

function NumericInputField({
  column,
  value,
  onChange
}: {
  column: ColumnInfo
  value: string | null
  onChange: (value: string | null) => void
}) {
  return (
    <Input
      id={column.name}
      type="number"
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
      placeholder={column.defaultValue ? String(column.defaultValue) : column.nullable ? '' : '0'}
      className="h-9 transition-all border-border focus:border-white! focus-visible:border-white! focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:ring-offset-0"
    />
  )
}

function BooleanInputField({
  column,
  value,
  onChange
}: {
  column: ColumnInfo
  value: string | null
  onChange: (value: string | null) => void
}) {
  const displayValue = value === null ? 'null' : value || (column.nullable ? 'null' : 'true')
  return (
    <Select value={displayValue} onValueChange={(val) => onChange(val === 'null' ? null : val)}>
      <SelectTrigger id={column.name} className="h-9 w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {column.nullable && <SelectItem value="null">NULL</SelectItem>}
        <SelectItem value="true">true</SelectItem>
        <SelectItem value="false">false</SelectItem>
      </SelectContent>
    </Select>
  )
}

function DateInputField({
  value,
  onChange,
  showTimezone = false
}: {
  column: ColumnInfo
  value: string | null
  onChange: (value: string | null) => void
  showTimezone?: boolean
}) {
  return (
    <DateTimePickerField
      value={value ? new Date(value) : undefined}
      onChange={(date) => onChange(date ? date.toISOString() : null)}
      showTimezone={showTimezone}
    />
  )
}

function EnumInputField({
  column,
  value,
  onChange
}: {
  column: ColumnInfo
  value: string | null
  onChange: (value: string | null) => void
}) {
  const enumValues = column.enumValues || []
  const displayValue =
    value === null ? 'null' : value || (column.nullable ? 'null' : enumValues[0] || 'null')
  return (
    <Select value={displayValue} onValueChange={(val) => onChange(val === 'null' ? null : val)}>
      <SelectTrigger id={column.name} className="h-9 w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {column.nullable && <SelectItem value="null">NULL</SelectItem>}
        {enumValues.map((val) => (
          <SelectItem key={val} value={val}>
            {val}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function RowInputField({
  column,
  value,
  onChange
}: {
  column: ColumnInfo
  value: string | null
  onChange: (value: string | null) => void
}) {
  const variant = getCellVariant(column.type, column.enumValues)

  switch (variant) {
    case 'numeric':
      return <NumericInputField column={column} value={value} onChange={onChange} />
    case 'boolean':
      return <BooleanInputField column={column} value={value} onChange={onChange} />
    case 'date_with_timezone':
      return (
        <DateInputField column={column} value={value} onChange={onChange} showTimezone={true} />
      )
    case 'date_without_timezone':
      return <DateInputField column={column} value={value} onChange={onChange} />
    case 'enum':
      return <EnumInputField column={column} value={value} onChange={onChange} />
    default:
      return <TextInputField column={column} value={value} onChange={onChange} />
  }
}

export function AddRowDrawer({
  open,
  onOpenChange,
  columns,
  onSubmit,
  isPending,
  tableName
}: AddRowDialogProps) {
  const [values, setValues] = useState<Record<string, string | null>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(values)
  }

  const handleValueChange = (columnName: string, value: string | null) => {
    setValues((prev) => ({ ...prev, [columnName]: value }))
  }

  return (
    <Sheet
      open={open}
      onOpenChange={() => {
        onOpenChange(false)
        setValues({})
      }}
    >
      <SheetContent side="right" className="w-full sm:max-w-lg [&>button]:hidden gap-0">
        <SheetTitle>
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="text-lg font-semibold">
              {tableName ? `Add row to ${tableName}` : 'Add New Row'}
            </h2>
          </div>
        </SheetTitle>
        <div className="relative flex-1 overflow-y-auto">
          <div className="flex flex-col gap-3 px-6 pt-6">
            {columns.map((column) => (
              <div key={column.name} className="flex flex-col gap-1.5">
                <Label
                  htmlFor={column.name}
                  className="text-sm font-medium flex justify-between items-center"
                >
                  <span>
                    {column.name}
                    {!column.nullable && <span className="text-destructive/70 ml-1">*</span>}
                  </span>
                  <span className="text-muted-foreground text-xs">{column.type}</span>
                </Label>
                <RowInputField
                  column={column}
                  value={values[column.name] || ''}
                  onChange={(value) => handleValueChange(column.name, value)}
                />
              </div>
            ))}
          </div>
          <div
            aria-hidden
            className="pointer-events-none sticky bottom-0 z-10 h-14 w-full bg-linear-to-b from-background/0 via-background/70 to-background"
          />
        </div>

        <SheetFooter className="flex flex-row items-center justify-end gap-2 border-t p-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending} onClick={handleSubmit} size="sm">
            {isPending ? 'Adding...' : 'Add Row'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
