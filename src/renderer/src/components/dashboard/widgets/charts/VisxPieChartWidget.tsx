/**
 * Visx Pie Chart Widget
 * Renders a pie/donut chart using visx for high-quality data visualization
 */

import { Group } from '@visx/group'
import { ParentSize } from '@visx/responsive'
import { scaleOrdinal } from '@visx/scale'
import { Pie } from '@visx/shape'
import { Pencil, RefreshCw, Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import type { ChartWidgetSettings, WidgetComponentProps } from '../../types'
import { PieChartPlaceholder } from '../placeholders'
import { useWidgetData } from '../useWidgetData'

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
}

function PieChart({ data, width, height, showLegend, colors }: PieChartProps) {
  const radius = Math.min(width, height) / 2 - (showLegend ? 40 : 20)
  const centerX = width / 2
  const centerY = height / 2

  const colorScale = useMemo(
    () =>
      scaleOrdinal({
        domain: data.map((d) => d.label),
        range: colors
      }),
    [data, colors]
  )

  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data])

  if (width < 100 || height < 100 || radius < 20) {
    return null
  }

  return (
    <div className="relative w-full h-full">
      <svg width={width} height={showLegend ? height - 40 : height}>
        <Group top={centerY - (showLegend ? 20 : 0)} left={centerX}>
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
                    <path d={pie.path(arc) ?? ''} fill={colorScale(arc.data.label)} />
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
        </Group>
      </svg>
      {showLegend && (
        <div className="absolute bottom-0 left-0 right-0 flex flex-wrap justify-center gap-2 px-2">
          {data.slice(0, 5).map((d) => (
            <div key={d.label} className="flex items-center gap-1 text-xs">
              <span
                className="w-2 h-2 rounded-full"
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
    </div>
  )
}

export function VisxPieChartWidget({
  widget,
  connectionId,
  isEditMode,
  onEdit,
  onDelete,
  onRefresh
}: WidgetComponentProps<ChartWidgetSettings>) {
  const { settings, title } = widget

  const {
    data: queryData,
    isLoading,
    error,
    refetch
  } = useWidgetData(widget, connectionId, { limit: 20 })

  const chartData: DataPoint[] = useMemo(() => {
    if (!queryData?.rows?.length || !settings.xAxisField || !settings.yAxisField) {
      return []
    }

    return queryData.rows.map((row) => {
      const record = row as Record<string, unknown>
      const rawValue = record[settings.yAxisField]
      const value = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue)) || 0

      return {
        label: String(record[settings.xAxisField] ?? ''),
        value: Math.abs(value) // Pie charts need positive values
      }
    })
  }, [queryData, settings.xAxisField, settings.yAxisField])

  const handleRefresh = () => {
    refetch()
    onRefresh?.()
  }

  const colors = settings.colors ?? defaultColors

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium truncate">{title}</CardTitle>
        {isEditMode && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleRefresh}
              title="Refresh"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onEdit?.(widget)}
              title="Edit"
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={() => onDelete?.(widget.id)}
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-pulse w-full h-full bg-muted rounded" />
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center text-sm text-destructive">
            {error instanceof Error ? error.message : 'Failed to load data'}
          </div>
        ) : !chartData.length ? (
          <div className="h-full flex flex-col">
            <div className="flex-1">
              <PieChartPlaceholder />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {!settings.xAxisField || !settings.yAxisField
                ? 'Configure label and value fields'
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
                colors={colors}
              />
            )}
          </ParentSize>
        )}
      </CardContent>
    </Card>
  )
}
