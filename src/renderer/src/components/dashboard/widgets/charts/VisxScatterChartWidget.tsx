/**
 * Visx Scatter Chart Widget
 * Renders a scatter plot using visx for high-quality data visualization
 * Supports brush selection for zooming when in widget mode
 */

import { AxisBottom, AxisLeft } from '@visx/axis'
import { Brush } from '@visx/brush'
import type BaseBrush from '@visx/brush/lib/BaseBrush'
import { Grid } from '@visx/grid'
import { Group } from '@visx/group'
import { PatternLines } from '@visx/pattern'
import { ParentSize } from '@visx/responsive'
import { scaleLinear } from '@visx/scale'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ScatterWidgetSettings } from '@common/types'
import type { ChartZoomState, WidgetComponentProps } from '@renderer/types/dashboard'
import { ChartTooltip } from './ChartTooltip'
import { ScatterChartPlaceholder } from '../placeholders'
import { useWidgetData } from '../useWidgetData'
import { WidgetWrapper } from '../WidgetWrapper'

// Chart margin configuration
const margin = { top: 20, right: 20, bottom: 60, left: 60 }

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
  xLabel?: string
  yLabel?: string
  enableBrush?: boolean
  zoomState?: ChartZoomState
  onBrushEnd?: (xMin: number, xMax: number, yMin: number, yMax: number) => void
}

function ScatterChart({
  data,
  width,
  height,
  showGrid,
  colors,
  xLabel,
  yLabel,
  enableBrush,
  zoomState,
  onBrushEnd
}: ScatterChartProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null)
  const brushRef = useRef<BaseBrush | null>(null)
  const pendingBrushRef = useRef<{ xMin: number; xMax: number; yMin: number; yMax: number } | null>(null)

  // Filter data based on zoom state
  const displayData = useMemo(() => {
    if (!zoomState?.xMin && zoomState?.xMin !== 0) return data
    if (!zoomState?.xMax && zoomState?.xMax !== 0) return data
    if (!zoomState?.yMin && zoomState?.yMin !== 0) return data
    if (!zoomState?.yMax && zoomState?.yMax !== 0) return data
    return data.filter(
      (d) =>
        d.x >= zoomState.xMin! &&
        d.x <= zoomState.xMax! &&
        d.y >= zoomState.yMin! &&
        d.y <= zoomState.yMax!
    )
  }, [data, zoomState])

  const xMax = width - margin.left - margin.right
  const yMax = height - margin.top - margin.bottom

  const xScale = useMemo(() => {
    // Use zoom bounds if provided, otherwise compute from data
    if (zoomState?.xMin !== undefined && zoomState?.xMax !== undefined) {
      return scaleLinear<number>({
        range: [0, xMax],
        domain: [zoomState.xMin, zoomState.xMax]
      })
    }
    const values = displayData.map((d) => d.x)
    const minValue = Math.min(...values)
    const maxValue = Math.max(...values)
    const range = maxValue - minValue
    const rightPadding = range > 0 ? range * 0.05 : Math.max(1, Math.abs(maxValue) * 0.1)
    const domainMin = minValue >= 0 ? 0 : minValue - rightPadding
    return scaleLinear<number>({
      range: [0, xMax],
      domain: [domainMin, maxValue + rightPadding]
    })
  }, [displayData, xMax, zoomState])

  const yScale = useMemo(() => {
    // Use zoom bounds if provided, otherwise compute from data
    if (zoomState?.yMin !== undefined && zoomState?.yMax !== undefined) {
      return scaleLinear<number>({
        range: [yMax, 0],
        domain: [zoomState.yMin, zoomState.yMax]
      })
    }
    const values = displayData.map((d) => d.y)
    const minValue = Math.min(...values)
    const maxValue = Math.max(...values)
    const range = maxValue - minValue
    const topPadding = range > 0 ? range * 0.05 : Math.max(1, Math.abs(maxValue) * 0.1)
    const domainMin = minValue >= 0 ? 0 : minValue - topPadding
    return scaleLinear<number>({
      range: [yMax, 0],
      domain: [domainMin, maxValue + topPadding]
    })
  }, [displayData, yMax, zoomState])

  // Store the brush selection for processing on mouse up
  const handleBrushChange = useCallback(
    (domain: { x0: number; x1: number; y0: number; y1: number } | null) => {
      if (!domain) {
        pendingBrushRef.current = null
        return
      }
      const { x0, x1, y0, y1 } = domain
      // x0, x1, y0, y1 are already in the data domain, not pixel positions
      // Use Math.min/max to handle any drag direction
      const xMinVal = Math.min(x0, x1)
      const xMaxVal = Math.max(x0, x1)
      const yMinVal = Math.min(y0, y1)
      const yMaxVal = Math.max(y0, y1)
      // Store for processing on brush end
      if (xMaxVal - xMinVal > 0.001 && yMaxVal - yMinVal > 0.001) {
        pendingBrushRef.current = { xMin: xMinVal, xMax: xMaxVal, yMin: yMinVal, yMax: yMaxVal }
      } else {
        pendingBrushRef.current = null
      }
    },
    []
  )

  // Handle mouse up - this triggers the zoom when brush drag ends
  const handleMouseUp = useCallback(() => {
    if (!onBrushEnd || !pendingBrushRef.current) return

    const { xMin, xMax, yMin, yMax } = pendingBrushRef.current
    pendingBrushRef.current = null

    if (brushRef.current) {
      brushRef.current.reset()
    }

    setTimeout(() => {
      onBrushEnd(xMin, xMax, yMin, yMax)
    }, 50)
  }, [onBrushEnd])

  // Use window event listener since brush uses useWindowMoveEvents
  useEffect(() => {
    if (!enableBrush) return

    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [enableBrush, handleMouseUp])

  if (width < 100 || height < 100) {
    return null
  }

  return (
    <div className="relative">
      <svg width={width} height={height}>
        <PatternLines
          id="brush-pattern-scatter"
          height={8}
          width={8}
          stroke={colors[0]}
          strokeWidth={1}
          orientation={['diagonal']}
        />
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
          {displayData.map((d, i) => (
            <circle
              key={`point-${i}`}
              cx={xScale(d.x)}
              cy={yScale(d.y)}
              r={5}
              fill={colors[i % colors.length]}
              fillOpacity={0.7}
              stroke={colors[i % colors.length]}
              strokeWidth={1}
              style={{ cursor: 'pointer' }}
              onMouseMove={(e) => {
                const svg = e.currentTarget.ownerSVGElement
                if (!svg) return
                const rect = svg.getBoundingClientRect()
                setTooltip({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top - 10,
                  content: `${d.label ? d.label + '\n' : ''}x: ${d.x}\ny: ${d.y}`
                })
              }}
              onMouseLeave={() => setTooltip(null)}
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
          {/* X Axis Label */}
          {xLabel && (
            <text
              x={xMax / 2}
              y={yMax + 35}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize={11}
            >
              {xLabel}
            </text>
          )}
          {/* Y Axis Label */}
          {yLabel && (
            <text
              x={-yMax / 2}
              y={-38}
              textAnchor="middle"
              transform="rotate(-90)"
              className="fill-muted-foreground"
              fontSize={11}
            >
              {yLabel}
            </text>
          )}
          {/* Brush for selection - only in widget mode, not expanded */}
          {enableBrush && !zoomState && (
            <Brush
              innerRef={brushRef}
              xScale={xScale}
              yScale={yScale}
              width={xMax}
              height={yMax}
              margin={margin}
              handleSize={8}
              resizeTriggerAreas={['left', 'right', 'top', 'bottom', 'topLeft', 'topRight', 'bottomLeft', 'bottomRight']}
              brushDirection="both"
              onChange={handleBrushChange}
              onClick={() => {
                pendingBrushRef.current = null
                if (brushRef.current) {
                  brushRef.current.reset()
                }
              }}
              selectedBoxStyle={{
                fill: 'url(#brush-pattern-scatter)',
                stroke: colors[0],
                strokeWidth: 1,
                fillOpacity: 0.3
              }}
              useWindowMoveEvents
            />
          )}
        </Group>
      </svg>
      {tooltip && (
        <ChartTooltip visible x={tooltip.x} y={tooltip.y} content={tooltip.content} />
      )}
    </div>
  )
}

export function VisxScatterChartWidget({
  widget,
  connectionId,
  isEditMode,
  isExpanded,
  zoomState,
  onEdit,
  onDelete,
  onRefresh,
  onExpand
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

    return queryData.rows.map((row) => {
      const record = row as Record<string, unknown>
      const rawX = record[settings.xAxisField]
      const rawY = record[settings.yAxisField]

      // Parse numeric values
      const x = typeof rawX === 'number' ? rawX : parseFloat(String(rawX)) || 0
      const y = typeof rawY === 'number' ? rawY : parseFloat(String(rawY)) || 0

      return {
        x,
        y,
        label: settings.labelField ? String(record[settings.labelField] ?? '') : undefined
      }
    })
  }, [queryData, settings.xAxisField, settings.yAxisField, settings.labelField])

  const handleRefresh = useCallback(() => {
    refetch()
    onRefresh?.()
  }, [refetch, onRefresh])

  // Handle brush selection - opens expanded view with zoom
  const handleBrushEnd = useCallback(
    (xMin: number, xMax: number, yMin: number, yMax: number) => {
      if (onExpand) {
        onExpand(widget, { xMin, xMax, yMin, yMax })
      }
    },
    [onExpand, widget]
  )

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
            <ScatterChartPlaceholder />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {!settings.xAxisField || !settings.yAxisField
              ? 'Configure X and Y axis fields (numeric only)'
              : 'No data available'}
          </p>
        </div>
      ) : (
        <ParentSize>
          {({ width, height }) => {
            // Calculate minimum width based on data points (20px per point, min 100%)
            const minWidth = Math.max(width, chartData.length * 20)
            const needsScroll = minWidth > width

            return (
              <div className={needsScroll ? 'h-full w-full overflow-x-auto' : 'h-full w-full'}>
                <div style={{ width: needsScroll ? minWidth : '100%', height: '100%' }}>
                  <ScatterChart
                    data={chartData}
                    width={needsScroll ? minWidth : width}
                    height={height}
                    showGrid={settings.showGrid ?? true}
                    colors={colors}
                    xLabel={settings.xAxisField}
                    yLabel={settings.yAxisField}
                    enableBrush={!isExpanded && !isEditMode}
                    zoomState={zoomState}
                    onBrushEnd={handleBrushEnd}
                  />
                </div>
              </div>
            )
          }}
        </ParentSize>
      )}
    </WidgetWrapper>
  )
}
