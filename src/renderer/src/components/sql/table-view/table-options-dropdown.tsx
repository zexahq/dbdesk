import { Button } from '@renderer/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import { cn } from '@renderer/lib/utils'
import { FileCode2, FileDown, MoreVertical, Trash2 } from 'lucide-react'

interface TableOptionsDropdownProps {
  onExportCSV: () => void
  onExportSQL: () => void
  onDelete: () => void
  disabled?: boolean
}

export function TableOptionsDropdown({
  onExportCSV,
  onExportSQL,
  onDelete,
  disabled
}: TableOptionsDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-8 w-8 cursor-pointer text-muted-foreground/60 hover:text-foreground hover:bg-accent active:text-foreground active:bg-accent'
          )}
          disabled={disabled}
        >
          <MoreVertical className="size-4" />
          <span className="sr-only">Table options</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        side="bottom"
        className="w-52"
        sideOffset={4}
        avoidCollisions
      >
        <DropdownMenuItem
          className="cursor-pointer text-sm flex items-center gap-2"
          onSelect={(e) => {
            e.preventDefault()
            onExportCSV()
          }}
        >
          <FileDown className="size-4" />
          <span>Export as CSV</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer text-sm flex items-center gap-2"
          onSelect={(e) => {
            e.preventDefault()
            onExportSQL()
          }}
        >
          <FileCode2 className="size-4" />
          <span>Export as SQL</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-sm flex items-center gap-2"
          onSelect={(e) => {
            e.preventDefault()
            onDelete()
          }}
        >
          <Trash2 className="size-4" />
          <span>Delete table</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
