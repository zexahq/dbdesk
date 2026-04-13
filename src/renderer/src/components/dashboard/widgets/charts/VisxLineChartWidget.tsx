/**
 * Visx Line Chart Widget
 * Renders a line chart using visx for high-quality data visualization
 * Supports brush selection for zooming when in widget mode
 */

import { AxisBottom, AxisLeft } from '@visx/axis'
import { Brush } from '@visx/brush'
import type BaseBrush from '@visx/brush/lib/BaseBrush'
import { curveMonotoneX } from '@visx/curve'
import { Grid } from '@visx/grid'
import { Group } from '@visx/group'
import { PatternLines } from '@visx/pattern'
import { ParentSize } from '@visx/responsive'
import { scaleLinear, scalePoint } from '@visx/scale'
import { LinePath } from '@visx/shape'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChartWidgetSettings } from '@common/types'
import type { ChartZoomState, WidgetComponentProps } from '@renderer/types/dashboard'
import { BrushHandle } from './BrushHandle'
import { ChartTooltip } from './ChartTooltip'
import { transformChartData, type ChartDataPoint, type ChartResult } from './chartUtils'
import { LineChartPlaceholder } from '../placeholders'
import { useWidgetData } from '../useWidgetData'
import { WidgetWrapper } from '../WidgetWrapper'

// Chart margin configuration
const margin = { top: 20, right: 20, bottom: 80, left: 60 }

// Default colors for lines
const defaultColors = ['#3b82f6', '#06b6d4', '#10b981', '#84cc16', '#eab308']

interface LineChartProps {
  data: ChartDataPoint[]
  width: number
  height: number
  showGrid: boolean
  colors: string[]
  yValueLabels: string[] | null
  xLabel?: string
  yLabel?: string
  isExpanded?: boolean
  enableBrush?: boolean
  zoomState?: ChartZoomState
  onBrushEnd?: (startIndex: number, endIndex: number) => void
}

function LineChart({
  data,
  width,
  height,
  showGrid,
  colors,
  yValueLabels,
  xLabel,
  yLabel,
  isExpanded,
  enableBrush,
  zoomState,
  onBrushEnd
}: LineChartProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null)
  const brushRef = useRef<BaseBrush | null>(null)
  const pendingBrushRef = useRef<{ startIndex: number; endIndex: number } | null>(null)

  // Apply zoom filtering if provided
  const displayData = useMemo(() => {
    if (zoomState?.startIndex === undefined || zoomState?.endIndex === undefined) return data
    return data.slice(zoomState.startIndex, zoomState.endIndex + 1)
  }, [data, zoomState])

  const xMax = width - margin.left - margin.right
  const yMax = height - margin.top - margin.bottom

  const xScale = useMemo(
    () =>
      scalePoint<string>({
        range: [0, xMax],
        domain: displayData.map((d) => d.label),
        padding: 0.5
      }),
    [displayData, xMax]
  )

  const yScale = useMemo(() => {
    // For categorical data, use fixed domain based on number of categories
    if (yValueLabels) {
      return scaleLinear<number>({
        range: [yMax, 0],
        domain: [-0.5, yValueLabels.length - 0.5]
      })
    }
    const values = displayData.map((d) => d.value)
    const minValue = Math.min(...values, 0)
    const maxValue = Math.max(...values, 0)
    return scaleLinear<number>({
      range: [yMax, 0],
      domain: [minValue * 0.9, maxValue * 1.1],
      nice: true
    })
  }, [displayData, yMax, yValueLabels])

  // Create a linear scale for brush (since brush needs numeric domain)
  const xScaleLinear = useMemo(
    () =>
      scaleLinear<number>({
        range: [0, xMax],
        domain: [0, data.length - 1]
      }),
    [data.length, xMax]
  )

  // Store the brush selection for processing on mouse up
  const handleBrushChange = useCallback(
    (domain: { x0: number; x1: number; y0: number; y1: number } | null) => {
      if (!domain) {
        pendingBrushRef.current = null
        return
      }
      const { x0, x1 } = domain
      // x0 and x1 are already in the data domain (indices), not pixel positions
      const startIndex = Math.max(0, Math.round(x0))
      const endIndex = Math.min(data.length - 1, Math.round(x1))
      // Store for processing on brush end
      if (endIndex - startIndex >= 1) {
        pendingBrushRef.current = { startIndex, endIndex }
      } else {
        pendingBrushRef.current = null
      }
    },
    [data.length]
  )

  // Handle mouse up on SVG - this triggers the zoom when brush drag ends
  const handleMouseUp = useCallback(() => {
    if (!onBrushEnd || !pendingBrushRef.current) return

    const { startIndex, endIndex } = pendingBrushRef.current
    pendingBrushRef.current = null

    // Reset brush first
    if (brushRef.current) {
      brushRef.current.reset()
    }

    // Trigger callback after a short delay to let brush reset
    setTimeout(() => {
      onBrushEnd(startIndex, endIndex)
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
      <svg width={width} height={height} className="text-foreground">
        <PatternLines
          id="brush-pattern-line"
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
          <LinePath
            data={displayData}
            x={(d) => xScale(d.label) ?? 0}
            y={(d) => yScale(d.value) ?? 0}
            stroke={colors[0]}
            strokeWidth={2}
            curve={curveMonotoneX}
          />
          {/* Data points */}
          {displayData.map((d, i) => (
            <circle
              key={`point-${i}`}
              cx={xScale(d.label) ?? 0}
              cy={yScale(d.value) ?? 0}
              r={4}
              fill={colors[0]}
              style={{ cursor: 'pointer' }}
              onMouseMove={(e) => {
                const svg = e.currentTarget.ownerSVGElement
                if (!svg) return
                const rect = svg.getBoundingClientRect()
                setTooltip({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top - 10,
                  content: `${d.label}: ${d.rawValue}`
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
              className: 'fill-foreground',
              fontSize: 10,
              textAnchor: 'end' as const,
              dy: '0.33em'
            }}
            numTicks={yValueLabels ? yValueLabels.length : 5}
            tickValues={yValueLabels ? yValueLabels.map((_, i) => i) : undefined}
            tickFormat={yValueLabels ? (v) => yValueLabels[v as number] ?? '' : undefined}
          />
          <AxisBottom
            top={yMax}
            scale={xScale}
            stroke="currentColor"
            tickStroke="currentColor"
            tickValues={displayData.map((d) => d.label)}
            tickLabelProps={{
              className: 'fill-foreground',
              fontSize: 10,
              textAnchor: isExpanded ? ('middle' as const) : ('end' as const),
              angle: isExpanded ? 0 : -45,
              dx: isExpanded ? 0 : 4,
              dy: isExpanded ? 0 : 4
            }}
          />
          {/* X Axis Label */}
          {xLabel && (
            <text
              x={xMax / 2}
              y={yMax + (isExpanded ? 35 : 65)}
              textAnchor="middle"
              className="fill-foreground"
              fontSize={11}
            >
              {xLabel}
            </text>
          )}
          {/* Y Axis Label */}
          {yLabel && (
            <text
              x={-yMax / 2}
              y={-45}
              textAnchor="middle"
              transform="rotate(-90)"
              className="fill-foreground"
              fontSize={11}
            >
              {yLabel}
            </text>
          )}
          {/* Brush for selection - only in widget mode, not expanded */}
          {enableBrush && !zoomState && (
            <Brush
              innerRef={brushRef}
              xScale={xScaleLinear}
              yScale={yScale}
              width={xMax}
              height={yMax}
              margin={margin}
              handleSize={8}
              resizeTriggerAreas={['left', 'right']}
              brushDirection="horizontal"
              onChange={handleBrushChange}
              onClick={() => {
                pendingBrushRef.current = null
                if (brushRef.current) {
                  brushRef.current.reset()
                }
              }}
              selectedBoxStyle={{
                fill: 'url(#brush-pattern-line)',
                stroke: colors[0],
                strokeWidth: 1,
                fillOpacity: 0.3
              }}
              useWindowMoveEvents
              renderBrushHandle={(props) => <BrushHandle {...props} />}
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

export function VisxLineChartWidget({
  widget,
  connectionId,
  isEditMode,
  isExpanded,
  zoomState,
  onEdit,
  onDelete,
  onRefresh,
  onExpand
}: WidgetComponentProps<ChartWidgetSettings>) {
  const { settings, title } = widget

  const {
    data: queryData,
    isLoading,
    error,
    refetch
  } = useWidgetData(widget, connectionId, { limit: 100 })

  // Transform data for chart using shared utility
  const chartResult: ChartResult = useMemo(
    () => transformChartData(queryData, settings.xAxisField, settings.yAxisField),
    [queryData, settings.xAxisField, settings.yAxisField]
  )

  const handleRefresh = useCallback(() => {
    refetch()
    onRefresh?.()
  }, [refetch, onRefresh])

  // Handle brush selection - opens expanded view with zoom
  const handleBrushEnd = useCallback(
    (startIndex: number, endIndex: number) => {
      if (onExpand) {
        onExpand(widget, { startIndex, endIndex })
      }
    },
    [onExpand, widget]
  )

  const colors = settings.colors ?? defaultColors

  // Memoize display data count for scroll sizing (avoids slicing array in every ParentSize render)
  const displayDataCount = useMemo(() => {
    if (zoomState?.startIndex !== undefined && zoomState?.endIndex !== undefined) {
      return zoomState.endIndex - zoomState.startIndex + 1
    }
    return chartResult.data.length
  }, [chartResult.data.length, zoomState])

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
      {!chartResult.data.length ? (
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
          {({ width, height }) => {
            // Calculate minimum width based on data points (40px per point, min 100%)
            const minWidth = Math.max(width, displayDataCount * 40)
            const needsScroll = minWidth > width

            return (
              <div className={needsScroll ? 'h-full w-full overflow-x-auto' : 'h-full w-full'}>
                <div style={{ width: needsScroll ? minWidth : '100%', height: '100%' }}>
                  <LineChart
                    data={chartResult.data}
                    width={needsScroll ? minWidth : width}
                    height={height}
                    showGrid={settings.showGrid ?? true}
                    colors={colors}
                    yValueLabels={chartResult.yValueLabels}
                    xLabel={settings.xAxisField}
                    yLabel={settings.yAxisField}
                    isExpanded={isExpanded}
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
