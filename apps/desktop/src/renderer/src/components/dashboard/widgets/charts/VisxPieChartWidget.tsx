/**
 * Visx Pie Chart Widget
 * Renders a pie/donut chart using visx for high-quality data visualization
 */

import { Group } from '@visx/group'
import { ParentSize } from '@visx/responsive'
import { scaleOrdinal } from '@visx/scale'
import { Pie } from '@visx/shape'
import { useCallback, useMemo, useState } from 'react'
import type { PieChartWidgetSettings } from '@common/types'
import type { WidgetComponentProps } from '@renderer/types/dashboard'
import { ChartTooltip } from './ChartTooltip'
import { PieChartPlaceholder } from '../placeholders'
import { useWidgetData } from '../useWidgetData'
import { WidgetWrapper } from '../WidgetWrapper'

// Default colors for pie slices
const defaultColors = ['#f43f5e', '#f97316', '#facc15', '#4ade80', '#22d3ee', '#8b5cf6', '#ec4899']

interface DataPoint {
  label: string
  value: number
}

interface PieChartProps {
  data: DataPoint[]
  width: number
  height: number
  showLegend: boolean
  colors: string[]
  showTable?: boolean
}

function PieChart({ data, width, height, showLegend, colors, showTable }: PieChartProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null)

  // Chart size is constrained by available height (pie is square)
  const availableHeight = height - (showLegend && !showTable ? 30 : 0)
  // When table is shown, limit chart to 60% of width so table has room
  const maxChartWidth = showTable ? width * 0.6 : width
  const chartSize = Math.min(maxChartWidth, availableHeight)
  const radius = chartSize / 2 - 10

  const colorScale = useMemo(
    () =>
      scaleOrdinal({
        domain: data.map((d) => d.label),
        range: colors
      }),
    [data, colors]
  )

  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data])

  // Sort data by value descending for the table
  const sortedData = useMemo(() => [...data].sort((a, b) => b.value - a.value), [data])

  if (width < 100 || height < 100 || radius < 20) {
    return null
  }

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Chart and Table Row */}
      <div className={`flex-1 min-h-0 flex flex-row ${!showTable ? 'justify-center' : ''}`}>
        {/* Chart - never shrinks */}
        <div className="shrink-0 flex items-center justify-center" style={{ width: chartSize, height: chartSize }}>
          <svg width={chartSize} height={chartSize}>
            <Group top={chartSize / 2} left={chartSize / 2}>
              <Pie
                data={data}
                pieValue={(d) => d.value}
                outerRadius={radius}
                innerRadius={radius * 0.5}
                padAngle={0.02}
              >
                {(pie) =>
                  pie.arcs.map((arc, i) => {
                    const [centroidX, centroidY] = pie.path.centroid(arc)
                    const hasSpaceForLabel = arc.endAngle - arc.startAngle >= 0.3
                    const percentage = ((arc.data.value / total) * 100).toFixed(1)

                    return (
                      <g key={`arc-${i}`}>
                        <path
                          d={pie.path(arc) ?? ''}
                          fill={colorScale(arc.data.label)}
                          style={{ cursor: 'pointer' }}
                          onMouseMove={(e) => {
                            const svg = e.currentTarget.ownerSVGElement
                            if (!svg) return
                            const containerRect = svg.parentElement?.parentElement?.parentElement?.getBoundingClientRect()
                            if (!containerRect) return
                            setTooltip({
                              x: e.clientX - containerRect.left,
                              y: e.clientY - containerRect.top - 10,
                              content: `${arc.data.label}\nCount: ${arc.data.value.toLocaleString()} (${percentage}%)`
                            })
                          }}
                          onMouseLeave={() => setTooltip(null)}
                        />
                        {hasSpaceForLabel && (
                          <text
                            x={centroidX}
                            y={centroidY}
                            dy=".33em"
                            fill="white"
                            fontSize={10}
                            textAnchor="middle"
                            pointerEvents="none"
                          >
                            {percentage}%
                          </text>
                        )}
                      </g>
                    )
                  })
                }
              </Pie>
              {/* Total in center */}
              <text
                x={0}
                y={0}
                textAnchor="middle"
                dy="-0.2em"
                className="fill-foreground"
                fontSize={14}
                fontWeight={600}
              >
                {total.toLocaleString()}
              </text>
              <text
                x={0}
                y={0}
                textAnchor="middle"
                dy="1.2em"
                className="fill-muted-foreground"
                fontSize={10}
              >
                total
              </text>
            </Group>
          </svg>
        </div>

        {/* Data Table - fills remaining space */}
        {showTable && (
          <div className="flex-1 min-w-0 border-l border-border/50 overflow-auto bg-muted/20 rounded-sm m-4">
            <table className="w-full text-[10px]">
              <thead className="bg-muted sticky top-0 p-1!">
                <tr>
                  <th className="text-left p-2 font-medium text-muted-foreground">Value</th>
                  <th className="text-right p-2 font-medium text-muted-foreground">Count</th>
                  <th className="text-right p-2 font-medium text-muted-foreground">%</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((d) => (
                  <tr key={d.label} className="border-t border-border/30 hover:bg-muted/30">
                    <td className="px-1.5 py-0.5">
                      <div className="flex items-center gap-1">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: colorScale(d.label) }}
                        />
                        <span className="truncate" title={d.label}>{d.label}</span>
                      </div>
                    </td>
                    <td className="text-right px-1.5 py-0.5 tabular-nums whitespace-nowrap">{d.value.toLocaleString()}</td>
                    <td className="text-right px-1.5 py-0.5 tabular-nums text-muted-foreground whitespace-nowrap">
                      {((d.value / total) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legend - only shown if table is hidden */}
      {showLegend && !showTable && (
        <div className="flex flex-wrap justify-center gap-2 px-2 py-1">
          {data.slice(0, 5).map((d) => (
            <div key={d.label} className="flex items-center gap-1 text-xs">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: colorScale(d.label) }}
              />
              <span className="text-muted-foreground truncate max-w-15">{d.label}</span>
            </div>
          ))}
          {data.length > 5 && (
            <span className="text-xs text-muted-foreground">+{data.length - 5} more</span>
          )}
        </div>
      )}
      {tooltip && (
        <ChartTooltip visible x={tooltip.x} y={tooltip.y} content={tooltip.content} />
      )}
    </div>
  )
}

export function VisxPieChartWidget({
  widget,
  connectionId,
  isEditMode,
  isExpanded,
  onEdit,
  onDelete,
  onRefresh,
  onExpand
}: WidgetComponentProps<PieChartWidgetSettings>) {
  const { settings, title } = widget

  const {
    data: queryData,
    isLoading,
    error,
    refetch
  } = useWidgetData(widget, connectionId, { limit: 20 })

  // Cast settings for backward compatibility (old widgets may have xAxisField)
  const legacySettings = settings as PieChartWidgetSettings & { xAxisField?: string }

  const chartData: DataPoint[] = useMemo(() => {
    const field = legacySettings.labelField ?? legacySettings.xAxisField
    if (!queryData?.rows?.length || !field) {
      return []
    }

    // Count occurrences of each unique value in the selected field
    const counts = new Map<string, number>()

    for (const row of queryData.rows) {
      const record = row as Record<string, unknown>
      const value = String(record[field] ?? '')
      counts.set(value, (counts.get(value) ?? 0) + 1)
    }

    return Array.from(counts.entries()).map(([label, value]) => ({
      label,
      value
    }))
  }, [queryData, legacySettings.labelField, legacySettings.xAxisField])

  const handleRefresh = useCallback(() => {
    refetch()
    onRefresh?.()
  }, [refetch, onRefresh])

  const colors = settings.colors ?? defaultColors

  return (
    <WidgetWrapper
      title={title}
      isEditMode={isEditMode}
      isExpanded={isExpanded}
      isLoading={isLoading}
      error={error instanceof Error ? error : null}
      onRefresh={handleRefresh}
      onEdit={() => onEdit?.(widget)}
      onDelete={() => onDelete?.(widget.id)}
      onExpand={() => onExpand?.(widget)}
    >
      {!chartData.length ? (
        <div className="h-full flex flex-col">
          <div className="flex-1">
            <PieChartPlaceholder />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {!(legacySettings.labelField ?? legacySettings.xAxisField)
              ? 'Select a field to show distribution'
              : 'No data available'}
          </p>
        </div>
      ) : (
        <ParentSize>
          {({ width, height }) => (
            <PieChart
              data={chartData}
              width={width}
              height={height}
              showLegend={settings.showLegend ?? true}
              showTable={settings.showTable ?? true}
              colors={colors}
            />
          )}
        </ParentSize>
      )}
    </WidgetWrapper>
  )
}
