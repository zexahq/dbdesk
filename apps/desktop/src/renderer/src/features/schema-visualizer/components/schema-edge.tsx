import { BaseEdge, getSmoothStepPath, Position, type EdgeProps } from '@xyflow/react'

export function SchemaEdge({ sourceX, sourceY, targetX, targetY, markerEnd }: EdgeProps) {
  const [path] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition: Position.Right,
    targetX,
    targetY,
    targetPosition: Position.Left,
    borderRadius: 8
  })

  return <BaseEdge path={path} markerEnd={markerEnd} style={{ strokeWidth: 1.5 }} />
}
