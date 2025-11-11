import { Layers, Table, RefreshCcw } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@renderer/components/ui/toggle-group'

interface SqlTopbarProps {
  view: 'tables' | 'structure'
  onViewChange: (view: 'tables' | 'structure') => void
}

export function SqlTopbar({ view, onViewChange }: SqlTopbarProps) {
  return (
    <div className="border-b">
      <div className="flex items-center justify-between gap-2 p-2">
        <ToggleGroup
          type="single"
          aria-label="Toggle view"
          defaultValue={view}
          onValueChange={onViewChange}
        >
          <ToggleGroupItem value="tables" aria-label="Toggle tables view">
            <Table className="size-4" />
            <span className="sr-only">Tables</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="structure" aria-label="Toggle structure view">
            <Layers className="size-4" />
            <span className="sr-only">Layers</span>
          </ToggleGroupItem>
        </ToggleGroup>
        <Button variant="ghost" size="icon" className="cursor-pointer">
          <RefreshCcw className="size-4 cursor-pointer" />
        </Button>
      </div>
    </div>
  )
}
