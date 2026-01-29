/**
 * Visx Line Chart Widget
 * Renders a line chart using visx for high-quality data visualization
 */

import { AxisBottom, AxisLeft } from '@visx/axis'
import { curveMonotoneX } from '@visx/curve'
import { Grid } from '@visx/grid'
import { Group } from '@visx/group'
import { ParentSize } from '@visx/responsive'
import { scaleLinear, scalePoint } from '@visx/scale'
import { LinePath } from '@visx/shape'
import { Pencil, RefreshCw, Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import type { ChartWidgetSettings, WidgetComponentProps } from '../../types'
import { LineChartPlaceholder } from '../placeholders'
import { useWidgetData } from '../useWidgetData'

// Chart margin configuration
const margin = { top: 20, right: 20, bottom: 40, left: 50 }

// Default colors for lines
const defaultColors = ['#3b82f6', '#06b6d4', '#10b981', '#84cc16', '#eab308']

interface DataPoint {
  label: string
  value: number
}

interface LineChartProps {
  data: DataPoint[]
  width: number
  height: number
  showGrid: boolean
  colors: string[]
}

function LineChart({ data, width, height, showGrid, colors }: LineChartProps) {
  const xMax = width - margin.left - margin.right
  const yMax = height - margin.top - margin.bottom

  const xScale = useMemo(
    () =>
      scalePoint<string>({
        range: [0, xMax],
        domain: data.map((d) => d.label),
        padding: 0.5
      }),
    [data, xMax]
  )

  const yScale = useMemo(() => {
    const values = data.map((d) => d.value)
    const minValue = Math.min(...values, 0)
    const maxValue = Math.max(...values, 0)
    return scaleLinear<number>({
      range: [yMax, 0],
      domain: [minValue * 0.9, maxValue * 1.1],
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
        <LinePath
          data={data}
          x={(d) => xScale(d.label) ?? 0}
          y={(d) => yScale(d.value) ?? 0}
          stroke={colors[0]}
          strokeWidth={2}
          curve={curveMonotoneX}
        />
        {/* Data points */}
        {data.map((d, i) => (
          <circle
            key={`point-${i}`}
            cx={xScale(d.label) ?? 0}
            cy={yScale(d.value) ?? 0}
            r={4}
            fill={colors[0]}
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
        />
      </Group>
    </svg>
  )
}

export function VisxLineChartWidget({
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
  } = useWidgetData(widget, connectionId, { limit: 100 })

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
              <LineChartPlaceholder />
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
              <LineChart
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
