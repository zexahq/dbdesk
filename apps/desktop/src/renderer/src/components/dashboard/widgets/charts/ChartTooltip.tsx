/**
 * Shared Chart Tooltip Component
 * Renders an instant tooltip for chart hover interactions
 */

interface ChartTooltipProps {
  visible: boolean
  x: number
  y: number
  content: string
}

export function ChartTooltip({ visible, x, y, content }: ChartTooltipProps) {
  if (!visible) return null

  return (
    <div
      className="absolute pointer-events-none z-50 px-2 py-1.5 text-xs rounded-md shadow-md bg-popover text-popover-foreground border border-border whitespace-pre-line"
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -100%)'
      }}
    >
      {content}
    </div>
  )
}
