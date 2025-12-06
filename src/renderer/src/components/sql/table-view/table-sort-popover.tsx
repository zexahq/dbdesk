import type { TableDataColumn, TableSortRule } from '@common/types'
import type { DragEndEvent } from '@dnd-kit/core'
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@renderer/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { Switch } from '@renderer/components/ui/switch'
import { cn } from '@renderer/lib/utils'
import { ArrowUpDown, GripVertical, Plus, X } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'

interface TableSortPopoverProps {
  columns?: TableDataColumn[]
  activeSorts?: TableSortRule[]
  onApply: (sorts: TableSortRule[] | undefined) => void
}

type SortRow = {
  id: string
  column?: string
  direction: TableSortRule['direction']
}

const DEFAULT_DIRECTION: TableSortRule['direction'] = 'ASC'

const createRowId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return Math.random().toString(36).slice(2)
}

const mapSortsToRows = (sorts: TableSortRule[] | undefined): SortRow[] => {
  if (!sorts || sorts.length === 0) {
    return []
  }

  return sorts.map((sort) => ({
    id: createRowId(),
    column: sort.column,
    direction: sort.direction
  }))
}

export function TableSortPopover({ columns = [], activeSorts, onApply }: TableSortPopoverProps) {
  const [open, setOpen] = useState(false)
  const [sortRows, setSortRows] = useState<SortRow[]>(() => mapSortsToRows(activeSorts))

  useEffect(() => {
    if (columns.length === 0) {
      setSortRows([])
      return
    }
    setSortRows(mapSortsToRows(activeSorts))
  }, [activeSorts, columns])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 }
    })
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) {
        return
      }

      setSortRows((prev) => {
        const oldIndex = prev.findIndex((row) => row.id === active.id)
        const newIndex = prev.findIndex((row) => row.id === over.id)
        if (oldIndex === -1 || newIndex === -1) {
          return prev
        }
        return arrayMove(prev, oldIndex, newIndex)
      })
    },
    [setSortRows]
  )

  const addSortRow = useCallback(() => {
    const defaultColumn = columns[0]?.name
    setSortRows((prev) => [
      ...prev,
      {
        id: createRowId(),
        column: defaultColumn,
        direction: DEFAULT_DIRECTION
      }
    ])
  }, [columns])

  const removeSortRow = useCallback((id: string) => {
    setSortRows((prev) => prev.filter((row) => row.id !== id))
  }, [])

  const updateSortRow = useCallback((id: string, updates: Partial<SortRow>) => {
    setSortRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...updates } : row)))
  }, [])

  const applySorts = () => {
    const parsed: TableSortRule[] = []
    for (const row of sortRows) {
      if (!row.column) {
        continue
      }
      parsed.push({
        column: row.column,
        direction: row.direction ?? DEFAULT_DIRECTION
      })
    }
    onApply(parsed.length > 0 ? parsed : undefined)
    setOpen(false)
  }

  const hasColumns = columns.length > 0
  const activeSortCount = activeSorts?.length ?? 0
  const hasSortsApplied = activeSortCount > 0
  const sortableIds = useMemo(() => sortRows.map((row) => row.id), [sortRows])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={hasSortsApplied ? 'default' : 'ghost'}
          className="cursor-pointer gap-2 h-8"
          disabled={!hasColumns}
        >
          <ArrowUpDown className="size-4" />
          <span className="text-sm">Sort</span>
          {hasSortsApplied ? (
            <Badge variant="secondary" className="text-[11px] px-1.5 py-0 font-medium">
              {activeSortCount}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[520px] p-4" align="start">
        <div className="space-y-3">
          <div className="text-base font-medium pb-1">Sort</div>
          <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pb-2">
            {sortRows.length === 0 && (
              <div className="text-sm text-muted-foreground">No sort rules added yet.</div>
            )}
            {sortRows.length > 0 && (
              <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                  {sortRows.map((row) => (
                    <SortableSortRow
                      key={row.id}
                      row={row}
                      columns={columns}
                      onColumnChange={(column) => updateSortRow(row.id, { column })}
                      onDirectionToggle={(direction) => updateSortRow(row.id, { direction })}
                      onRemove={() => removeSortRow(row.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>
          <div className="flex items-center justify-between border-t pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={addSortRow}
              className="gap-2 cursor-pointer text-sm"
              disabled={!hasColumns}
            >
              <Plus className="size-4" />
              Add sort
            </Button>
            <Button
              size="sm"
              onClick={applySorts}
              disabled={!hasColumns}
              className="cursor-pointer text-sm"
            >
              Apply sorting
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface SortableSortRowProps {
  row: SortRow
  columns: TableDataColumn[]
  onColumnChange: (column?: string) => void
  onDirectionToggle: (direction: TableSortRule['direction']) => void
  onRemove: () => void
}

function SortableSortRow({
  row,
  columns,
  onColumnChange,
  onDirectionToggle,
  onRemove
}: SortableSortRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id
  })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 rounded-md border p-2',
        isDragging && 'ring-2 ring-ring/60 bg-muted/40'
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
        <span className="sr-only">Reorder</span>
      </Button>
      <Select value={row.column ?? undefined} onValueChange={onColumnChange}>
        <SelectTrigger className="w-[200px] h-8">
          <SelectValue placeholder="Select column">
            {row.column ? (
              <span className="text-left">{row.column}</span>
            ) : (
              'Select column'
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="start" className="max-h-[300px] w-[250px]">
          {columns.map((column) => (
            <SelectItem key={column.name} value={column.name} className="min-w-max">
              <span className="flex flex-col justify-center text-left w-full">
                <span className="font-medium text-xs text-foreground whitespace-nowrap">
                  {column.name}
                </span>
                <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                  {column.dataType}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex items-center gap-2 rounded-md border px-3 py-2">
        <span className="text-xs text-muted-foreground">Ascending</span>
        <Switch
          checked={(row.direction ?? DEFAULT_DIRECTION) === 'ASC'}
          onCheckedChange={(checked) => onDirectionToggle(checked ? 'ASC' : 'DESC')}
        />
      </div>
      <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={onRemove}>
        <X className="size-4" />
        <span className="sr-only">Remove sort</span>
      </Button>
    </div>
  )
}
