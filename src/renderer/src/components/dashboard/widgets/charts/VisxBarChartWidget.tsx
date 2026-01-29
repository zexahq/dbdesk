/**
 * Visx Bar Chart Widget
 * Renders a bar chart using visx for high-quality data visualization
 */

import { AxisBottom, AxisLeft } from '@visx/axis'
import { Grid } from '@visx/grid'
import { Group } from '@visx/group'
import { ParentSize } from '@visx/responsive'
import { scaleBand, scaleLinear } from '@visx/scale'
import { Bar } from '@visx/shape'
import { Pencil, RefreshCw, Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import type { ChartWidgetSettings, WidgetComponentProps } from '../../types'
import { BarChartPlaceholder } from '../placeholders'
import { useWidgetData } from '../useWidgetData'

// Chart margin configuration
const margin = { top: 20, right: 20, bottom: 40, left: 50 }

// Default colors for bars
const defaultColors = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899']

interface DataPoint {
  label: string
  value: number
}

interface BarChartProps {
  data: DataPoint[]
  width: number
  height: number
  showGrid: boolean
  colors: string[]
}

function BarChart({ data, width, height, showGrid, colors }: BarChartProps) {
  // Calculate bounds
  const xMax = width - margin.left - margin.right
  const yMax = height - margin.top - margin.bottom

  // Create scales
  const xScale = useMemo(
    () =>
      scaleBand<string>({
        range: [0, xMax],
        domain: data.map((d) => d.label),
        padding: 0.3
      }),
    [data, xMax]
  )

  const yScale = useMemo(() => {
    const maxValue = Math.max(...data.map((d) => d.value), 0)
    return scaleLinear<number>({
      range: [yMax, 0],
      domain: [0, maxValue * 1.1], // Add 10% padding at top
      nice: true
    })
  }, [data, yMax])

  if (width < 100 || height < 100) {
    return null
  }

  return (
    <svg width={width} height={height}>
      <Group left={margin.left} top={margin.top}>
        {showGrid && (
          <Grid
            xScale={xScale}
            yScale={yScale}
            width={xMax}
            height={yMax}
            stroke="currentColor"
            strokeOpacity={0.1}
            numTicksColumns={data.length}
          />
        )}
        {data.map((d, i) => {
          const barWidth = xScale.bandwidth()
          const barHeight = yMax - (yScale(d.value) ?? 0)
          const barX = xScale(d.label) ?? 0
          const barY = yMax - barHeight

          return (
            <Bar
              key={`bar-${d.label}`}
              x={barX}
              y={barY}
              width={barWidth}
              height={barHeight}
              fill={colors[i % colors.length]}
              rx={2}
            />
          )
        })}
        <AxisLeft
          scale={yScale}
          stroke="currentColor"
          tickStroke="currentColor"
          tickLabelProps={{
            fill: 'currentColor',
            fontSize: 10,
            textAnchor: 'end' as const,
            dy: '0.33em'
          }}
          numTicks={5}
        />
        <AxisBottom
          top={yMax}
          scale={xScale}
          stroke="currentColor"
          tickStroke="currentColor"
          tickLabelProps={{
            fill: 'currentColor',
            fontSize: 10,
            textAnchor: 'middle' as const
          }}
        />
      </Group>
    </svg>
  )
}

export function VisxBarChartWidget({
  widget,
  connectionId,
  isEditMode,
  onEdit,
  onDelete,
  onRefresh
}: WidgetComponentProps<ChartWidgetSettings>) {
  const { settings, title } = widget

  // Fetch query data using shared hook
  const {
    data: queryData,
    isLoading,
    error,
    refetch
  } = useWidgetData(widget, connectionId, { limit: 100 })

  // Transform data for chart
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
        value
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
              <BarChartPlaceholder />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {!settings.xAxisField || !settings.yAxisField
                ? 'Configure X and Y axis fields'
                : 'No data available'}
            </p>
          </div>
        ) : (
          <ParentSize>
            {({ width, height }) => (
              <BarChart
                data={chartData}
                width={width}
                height={height}
                showGrid={settings.showGrid ?? true}
                colors={colors}
              />
            )}
          </ParentSize>
        )}
      </CardContent>
    </Card>
  )
}
