import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { cn } from '@renderer/shared/lib/utils'
import { KeyRound, Link2 } from 'lucide-react'
import { memo } from 'react'

export type DiagramField = {
  name: string
  type: string
  isPrimary: boolean
  isForeign: boolean
  isReferenced: boolean
}

export type SchemaTableNodeData = Record<string, unknown> & {
  schema: string
  table: string
  fields: DiagramField[]
  focused?: boolean
}

export type SchemaTableNode = Node<SchemaTableNodeData, 'table'>

function TableNode({ data }: NodeProps<SchemaTableNode>) {
  return (
    <div
      className={cn(
        'w-64 overflow-hidden rounded-lg border bg-card shadow-sm transition-shadow',
        data.focused && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
    >
      <div className="border-b bg-muted/50 px-3 py-2">
        <p className="truncate text-sm font-semibold">{data.table}</p>
        <p className="truncate text-xs text-muted-foreground">{data.schema}</p>
      </div>
      <div className="py-1">
        {data.fields.map((field) => (
          <div key={field.name} className="relative flex items-center gap-2 px-3 py-1.5 text-xs">
            {field.isReferenced && (
              <Handle
                type="target"
                position={Position.Left}
                id={field.name}
                className="!size-2 !border-2 !border-card !bg-primary"
                isConnectable={false}
              />
            )}
            <span className="min-w-0 flex-1 truncate font-medium">{field.name}</span>
            {field.isPrimary && (
              <KeyRound className="size-3 shrink-0 text-amber-500" aria-label="Primary key" />
            )}
            {field.isForeign && (
              <Link2 className="size-3 shrink-0 text-primary" aria-label="Foreign key" />
            )}
            <span className="max-w-24 truncate font-mono text-[11px] text-muted-foreground">
              {field.type}
            </span>
            {field.isForeign && (
              <Handle
                type="source"
                position={Position.Right}
                id={field.name}
                className="!size-2 !border-2 !border-card !bg-primary"
                isConnectable={false}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default memo(TableNode)
