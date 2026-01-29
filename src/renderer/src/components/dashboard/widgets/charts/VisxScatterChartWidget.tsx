/**
 * Visx Scatter Chart Widget
 * Renders a scatter plot using visx for high-quality data visualization
 */

import { AxisBottom, AxisLeft } from '@visx/axis'
import { Grid } from '@visx/grid'
import { Group } from '@visx/group'
import { ParentSize } from '@visx/responsive'
import { scaleLinear } from '@visx/scale'
import { Circle } from '@visx/shape'
import { Pencil, RefreshCw, Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import type { ScatterWidgetSettings, WidgetComponentProps } from '../../types'
import { ScatterChartPlaceholder } from '../placeholders'
import { useWidgetData } from '../useWidgetData'

// Chart margin configuration
const margin = { top: 20, right: 20, bottom: 40, left: 50 }

// Default colors for scatter points
const defaultColors = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899']

interface DataPoint {
  x: number
  y: number
  label?: string
}

interface ScatterChartProps {
  data: DataPoint[]
  width: number
  height: number
  showGrid: boolean
  colors: string[]
}

function ScatterChart({ data, width, height, showGrid, colors }: ScatterChartProps) {
  const xMax = width - margin.left - margin.right
  const yMax = height - margin.top - margin.bottom

  const xScale = useMemo(() => {
    const values = data.map((d) => d.x)
    const minValue = Math.min(...values)
    const maxValue = Math.max(...values)
    const padding = (maxValue - minValue) * 0.1 || 1
    return scaleLinear<number>({
      range: [0, xMax],
      domain: [minValue - padding, maxValue + padding],
      nice: true
    })
  }, [data, xMax])

  const yScale = useMemo(() => {
    const values = data.map((d) => d.y)
    const minValue = Math.min(...values)
    const maxValue = Math.max(...values)
    const padding = (maxValue - minValue) * 0.1 || 1
    return scaleLinear<number>({
      range: [yMax, 0],
      domain: [minValue - padding, maxValue + padding],
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
          />
        )}
        {data.map((d, i) => (
          <Circle
            key={`point-${i}`}
            cx={xScale(d.x)}
            cy={yScale(d.y)}
            r={5}
            fill={colors[i % colors.length]}
            fillOpacity={0.7}
            stroke={colors[i % colors.length]}
            strokeWidth={1}
          />
        ))}
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
          numTicks={5}
        />
      </Group>
    </svg>
  )
}

export function VisxScatterChartWidget({
  widget,
  connectionId,
  isEditMode,
  onEdit,
  onDelete,
  onRefresh
}: WidgetComponentProps<ScatterWidgetSettings>) {
  const { settings, title } = widget

  const {
    data: queryData,
    isLoading,
    error,
    refetch
  } = useWidgetData(widget, connectionId, { limit: 500 })

  const chartData: DataPoint[] = useMemo(() => {
    if (!queryData?.rows?.length || !settings.xAxisField || !settings.yAxisField) {
      return []
    }

    const result: DataPoint[] = []
    for (const row of queryData.rows) {
      const record = row as Record<string, unknown>
      const rawX = record[settings.xAxisField]
      const rawY = record[settings.yAxisField]
      const x = typeof rawX === 'number' ? rawX : parseFloat(String(rawX))
      const y = typeof rawY === 'number' ? rawY : parseFloat(String(rawY))

      if (!isNaN(x) && !isNaN(y)) {
        result.push({
          x,
          y,
          label: settings.labelField ? String(record[settings.labelField] ?? '') : undefined
        })
      }
    }
    return result
  }, [queryData, settings.xAxisField, settings.yAxisField, settings.labelField])

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
          <ParentSize>
            {({ width, height }) => (
              <div className="h-full flex flex-col items-center justify-center">
                <ScatterChartPlaceholder width={width} height={height * 0.7} />
                <p className="text-xs text-muted-foreground mt-2">
                  {!settings.xAxisField || !settings.yAxisField
                    ? 'Configure X and Y axis fields'
                    : 'No data available'}
                </p>
              </div>
            )}
          </ParentSize>
        ) : (
          <ParentSize>
            {({ width, height }) => (
              <ScatterChart
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
