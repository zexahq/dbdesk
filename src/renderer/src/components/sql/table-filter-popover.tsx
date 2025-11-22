import type { TableDataColumn, TableFilterCondition } from '@common/types'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@renderer/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { Filter, Plus, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { TABLE_FILTER_IS_VALUES, TABLE_FILTER_OPERATORS } from './constants'

interface TableFilterPopoverProps {
  columns?: TableDataColumn[]
  activeFilters?: TableFilterCondition[]
  onApply: (filters: TableFilterCondition[] | undefined) => void
}

type FilterRow = {
  id: string
  column?: string
  operator?: TableFilterCondition['operator']
  value: string
}

const createRowId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return Math.random().toString(36).slice(2)
}

const serializeFilterValue = (filter: TableFilterCondition): string => {
  if (filter.operator === 'IS') {
    return filter.value
  }

  if (filter.operator === 'IN') {
    return filter.value.map((v) => String(v)).join(', ')
  }

  return String(filter.value)
}

const mapFiltersToRows = (filters: TableFilterCondition[] | undefined): FilterRow[] => {
  if (!filters || filters.length === 0) {
    return []
  }

  return filters.map((filter) => ({
    id: createRowId(),
    column: filter.column,
    operator: filter.operator,
    value: serializeFilterValue(filter)
  }))
}

export function TableFilterPopover({
  columns = [],
  activeFilters,
  onApply
}: TableFilterPopoverProps) {
  const [open, setOpen] = useState(false)
  const [filterRows, setFilterRows] = useState<FilterRow[]>(() => mapFiltersToRows(activeFilters))

  useEffect(() => {
    if (columns.length === 0) {
      setFilterRows([])
      return
    }
    setFilterRows(mapFiltersToRows(activeFilters))
  }, [columns, activeFilters])

  const addFilterRow = useCallback(() => {
    const defaultColumn = columns[0]?.name
    setFilterRows((prev) => [
      ...prev,
      {
        id: createRowId(),
        column: defaultColumn,
        operator: '=',
        value: ''
      }
    ])
  }, [columns])

  const removeFilterRow = useCallback((id: string) => {
    setFilterRows((prev) => prev.filter((row) => row.id !== id))
  }, [])

  const updateFilterRow = useCallback((id: string, updates: Partial<FilterRow>) => {
    setFilterRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...updates } : row)))
  }, [])

  const parseFilters = (): TableFilterCondition[] => {
    const parsed: TableFilterCondition[] = []

    for (const row of filterRows) {
      if (!row.column || !row.operator) {
        continue
      }

      if (row.operator === 'IS') {
        if (row.value && TABLE_FILTER_IS_VALUES.some((opt) => opt.value === row.value)) {
          parsed.push({
            column: row.column,
            operator: 'IS',
            value: row.value as (typeof TABLE_FILTER_IS_VALUES)[number]['value']
          })
        }
        continue
      }

      if (row.operator === 'IN') {
        const values = row.value
          .split(',')
          .map((v) => v.trim())
          .filter((v) => v.length > 0)

        if (values.length === 0) {
          continue
        }

        const parsedValues = values.map((value) => {
          const num = Number(value)
          if (!Number.isNaN(num) && Number.isFinite(num)) {
            return num
          }
          if (value.toLowerCase() === 'true') {
            return true
          }
          if (value.toLowerCase() === 'false') {
            return false
          }
          return value
        })

        parsed.push({
          column: row.column,
          operator: 'IN',
          value: parsedValues
        })
        continue
      }

      if (!row.value.trim()) {
        continue
      }

      let scalar: string | number | boolean = row.value.trim()
      const numeric = Number(scalar)
      if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
        scalar = numeric
      } else if (scalar.toLowerCase() === 'true') {
        scalar = true
      } else if (scalar.toLowerCase() === 'false') {
        scalar = false
      }

      parsed.push({
        column: row.column,
        operator: row.operator,
        value: scalar
      } as TableFilterCondition)
    }

    return parsed
  }

  const applyFilters = () => {
    const parsed = parseFilters()
    onApply(parsed.length > 0 ? parsed : undefined)
    setOpen(false)
  }

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      applyFilters()
    }
  }

  const hasColumns = columns.length > 0
  const activeFiltersCount = activeFilters?.length ?? 0
  const hasFiltersApplied = activeFiltersCount > 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={hasFiltersApplied ? 'default' : 'ghost'}
          className="cursor-pointer gap-2 h-8"
          disabled={!hasColumns}
        >
          <Filter className="size-4" />
          <span className="text-sm">Filter</span>
          {hasFiltersApplied ? (
            <Badge variant="secondary" className="text-[11px] px-1.5 py-0 font-medium">
              {activeFiltersCount}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[600px] p-4" align="start">
        <div className="space-y-3">
          <div className="text-base font-medium pb-1">Filter</div>
          <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pb-2">
            {filterRows.map((row) => (
              <div key={row.id} className="flex items-center gap-2">
                <Select
                  value={row.column ?? undefined}
                  onValueChange={(value) => updateFilterRow(row.id, { column: value })}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select column">
                      {row.column ? (
                        <span className="text-left">{row.column}</span>
                      ) : (
                        'Select column'
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent align="start">
                    {columns.map((column) => (
                      <SelectItem key={column.name} value={column.name}>
                        <span className="flex flex-row items-center gap-2 text-left">
                          <span className="font-medium text-foreground">{column.name}</span>
                          <span className="text-xs text-muted-foreground">{column.dataType}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={row.operator ?? undefined}
                  onValueChange={(value) =>
                    updateFilterRow(row.id, {
                      operator: value as TableFilterCondition['operator'],
                      value: ''
                    })
                  }
                >
                  <SelectTrigger className="w-[60px]">
                    <SelectValue placeholder="Operator">
                      {row.operator
                        ? (TABLE_FILTER_OPERATORS.find((op) => op.value === row.operator)
                            ?.shortLabel ?? row.operator)
                        : 'Operator'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent align="start">
                    {TABLE_FILTER_OPERATORS.map((operator) => (
                      <SelectItem key={operator.value} value={operator.value}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{operator.shortLabel}</span>
                          <span className="text-xs text-muted-foreground">{operator.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {row.operator === 'IS' ? (
                  <Select
                    value={row.value}
                    onValueChange={(value) => updateFilterRow(row.id, { value })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select value" />
                    </SelectTrigger>
                    <SelectContent>
                      {TABLE_FILTER_IS_VALUES.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    className="flex-1"
                    placeholder={
                      row.operator === 'IN' ? 'Enter values separated by commas' : 'Enter a value'
                    }
                    value={row.value}
                    onChange={(event) => updateFilterRow(row.id, { value: event.target.value })}
                    onKeyDown={handleInputKeyDown}
                  />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => removeFilterRow(row.id)}
                >
                  <X className="size-4" />
                  <span className="sr-only">Remove filter</span>
                </Button>
              </div>
            ))}
            {filterRows.length === 0 && (
              <div className="text-sm text-muted-foreground">No filters added yet.</div>
            )}
          </div>
          <div className="flex items-center justify-between border-t pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={addFilterRow}
              className="gap-2 cursor-pointer text-sm"
              disabled={!hasColumns}
            >
              <Plus className="size-4" />
              Add filter
            </Button>
            <Button
              size="sm"
              onClick={applyFilters}
              disabled={!hasColumns}
              className="cursor-pointer text-sm"
            >
              Apply filter
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
