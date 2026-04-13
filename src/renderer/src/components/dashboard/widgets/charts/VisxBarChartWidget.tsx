/**
 * Visx Bar Chart Widget
 * Renders a bar chart using visx for high-quality data visualization
 * Supports brush selection for zooming when in widget mode
 */

import { AxisBottom, AxisLeft } from '@visx/axis'
import { Brush } from '@visx/brush'
import type BaseBrush from '@visx/brush/lib/BaseBrush'
import { Grid } from '@visx/grid'
import { Group } from '@visx/group'
import { PatternLines } from '@visx/pattern'
import { ParentSize } from '@visx/responsive'
import { scaleBand, scaleLinear } from '@visx/scale'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChartWidgetSettings } from '@common/types'
import type { ChartZoomState, WidgetComponentProps } from '@renderer/types/dashboard'
import { BrushHandle } from './BrushHandle'
import { ChartTooltip } from './ChartTooltip'
import { transformChartData, type ChartDataPoint, type ChartResult } from './chartUtils'
import { BarChartPlaceholder } from '../placeholders'
import { useWidgetData } from '../useWidgetData'
import { WidgetWrapper } from '../WidgetWrapper'

// Chart margin configuration - charts with category labels need more margin
const getMargin = (isHorizontal: boolean, hasCategoryYLabels: boolean = false) => ({
  top: 20,
  right: 20,
  bottom: 80,
  left: isHorizontal || hasCategoryYLabels ? 120 : 60
})

// Default colors for bars
const defaultColors = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899']

interface BarChartProps {
  data: ChartDataPoint[]
  width: number
  height: number
  showGrid: boolean
  colors: string[]
  yValueLabels: string[] | null
  xLabel?: string
  yLabel?: string
  orientation?: 'vertical' | 'horizontal'
  isExpanded?: boolean
  enableBrush?: boolean
  zoomState?: ChartZoomState
  onBrushEnd?: (startIndex: number, endIndex: number) => void
}

function BarChart({
  data,
  width,
  height,
  showGrid,
  colors,
  yValueLabels,
  xLabel,
  yLabel,
  orientation = 'vertical',
  isExpanded,
  enableBrush,
  zoomState,
  onBrushEnd
}: BarChartProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null)
  const brushRef = useRef<BaseBrush | null>(null)
  const pendingBrushRef = useRef<{ startIndex: number; endIndex: number } | null>(null)

  // Apply zoom filtering if provided
  const displayData = useMemo(() => {
    if (zoomState?.startIndex === undefined || zoomState?.endIndex === undefined) return data
    return data.slice(zoomState.startIndex, zoomState.endIndex + 1)
  }, [data, zoomState])

  const isHorizontal = orientation === 'horizontal'
  const margin = getMargin(isHorizontal, !!yValueLabels)

  // Calculate bounds
  const xMax = width - margin.left - margin.right
  const yMax = height - margin.top - margin.bottom

  // Truncate label helper
  const truncateLabel = (label: string, maxLength: number = 12) =>
    label.length > maxLength ? label.slice(0, maxLength) + '…' : label

  // Calculate how many labels can fit without overlap
  const xLabelSize = 60 // Approximate width per x-axis label
  const yLabelSize = 16 // Approximate height per y-axis label
  const maxXLabels = Math.max(1, Math.floor(xMax / xLabelSize))
  const maxYLabels = Math.max(1, Math.floor(yMax / yLabelSize))

  // For horizontal charts: filter y-axis (category) labels
  // For vertical charts: filter x-axis (category) labels
  const xLabelStep = Math.max(1, Math.ceil(displayData.length / maxXLabels))
  const yLabelStep = yValueLabels ? Math.max(1, Math.ceil(yValueLabels.length / maxYLabels)) : 1

  // Get filtered tick values for x-axis (category labels in vertical charts)
  const filteredXTickValues = useMemo(() => {
    if (displayData.length <= maxXLabels) {
      return displayData.map((d) => d.label)
    }
    return displayData
      .filter((_, i) => i % xLabelStep === 0)
      .map((d) => d.label)
  }, [displayData, maxXLabels, xLabelStep])

  // Get filtered tick values for y-axis (category labels in horizontal charts, or yValueLabels)
  const filteredYTickValues = useMemo(() => {
    if (isHorizontal) {
      if (displayData.length <= maxYLabels) {
        return displayData.map((d) => d.label)
      }
      return displayData
        .filter((_, i) => i % Math.max(1, Math.ceil(displayData.length / maxYLabels)) === 0)
        .map((d) => d.label)
    }
    // For vertical charts with categorical Y values, filter those
    if (yValueLabels) {
      if (yValueLabels.length <= maxYLabels) {
        return yValueLabels.map((_, i) => i)
      }
      return yValueLabels
        .map((_, i) => i)
        .filter((i) => i % yLabelStep === 0)
    }
    return undefined
  }, [displayData, isHorizontal, maxYLabels, yValueLabels, yLabelStep])

  // Create scales based on orientation
  const categoryScale = useMemo(
    () =>
      scaleBand<string>({
        range: isHorizontal ? [0, yMax] : [0, xMax],
        domain: displayData.map((d) => d.label),
        padding: 0.3
      }),
    [displayData, xMax, yMax, isHorizontal]
  )

  // Create a linear scale for brush (since brush needs numeric domain)
  const brushScale = useMemo(
    () =>
      scaleLinear<number>({
        range: [0, isHorizontal ? yMax : xMax],
        domain: [0, data.length - 1]
      }),
    [data.length, xMax, yMax, isHorizontal]
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

  // Handle mouse up - this triggers the zoom when brush drag ends
  const handleMouseUp = useCallback(() => {
    if (!onBrushEnd || !pendingBrushRef.current) return

    const { startIndex, endIndex } = pendingBrushRef.current
    pendingBrushRef.current = null

    if (brushRef.current) {
      brushRef.current.reset()
    }

    setTimeout(() => {
      onBrushEnd(startIndex, endIndex)
    }, 50)
  }, [onBrushEnd])

  // Use window event listener since brush uses useWindowMoveEvents
  useEffect(() => {
    if (!enableBrush || isHorizontal) return

    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [enableBrush, isHorizontal, handleMouseUp])

  const valueScale = useMemo(() => {
    if (yValueLabels) {
      return scaleLinear<number>({
        range: isHorizontal ? [0, xMax] : [yMax, 0],
        domain: isHorizontal ? [-0.5, yValueLabels.length - 0.5] : [-0.5, yValueLabels.length - 0.5]
      })
    }
    const maxValue = Math.max(...displayData.map((d) => d.value), 0)
    return scaleLinear<number>({
      range: isHorizontal ? [0, xMax] : [yMax, 0],
      domain: [0, maxValue * 1.1],
      nice: true
    })
  }, [displayData, xMax, yMax, yValueLabels, isHorizontal])

  if (width < 100 || height < 100) {
    return null
  }

  return (
    <div className="relative">
      <svg width={width} height={height} className="text-foreground">
        <PatternLines
          id="brush-pattern-bar"
          height={8}
          width={8}
          stroke={colors[0]}
          strokeWidth={1}
          orientation={['diagonal']}
        />
        <Group left={margin.left} top={margin.top}>
          {showGrid && (
            <Grid
              xScale={isHorizontal ? valueScale : categoryScale}
              yScale={isHorizontal ? categoryScale : valueScale}
              width={xMax}
              height={yMax}
              stroke="currentColor"
              strokeOpacity={0.1}
              numTicksColumns={isHorizontal ? 5 : displayData.length}
              numTicksRows={isHorizontal ? displayData.length : 5}
            />
          )}
          {displayData.map((d, i) => {
            const barThickness = categoryScale.bandwidth()
            const barLength = isHorizontal
              ? (valueScale(d.value) ?? 0)
              : yMax - (valueScale(d.value) ?? 0)

            const barX = isHorizontal ? 0 : (categoryScale(d.label) ?? 0)
            const barY = isHorizontal ? (categoryScale(d.label) ?? 0) : yMax - barLength
            const barWidth = isHorizontal ? barLength : barThickness
            const barHeight = isHorizontal ? barThickness : barLength

            return (
              <rect
                key={`bar-${i}-${d.label}`}
                x={barX}
                y={barY}
                width={barWidth}
                height={barHeight}
                fill={colors[i % colors.length]}
                rx={2}
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
            )
          })}
          <AxisLeft
            scale={isHorizontal ? categoryScale : valueScale}
            stroke="currentColor"
            tickStroke="currentColor"
            tickLabelProps={{
              className: 'fill-foreground',
              fontSize: 10,
              textAnchor: 'end' as const,
              dy: '0.33em'
            }}
            tickValues={isHorizontal ? filteredYTickValues as string[] : (yValueLabels ? filteredYTickValues as number[] : undefined)}
            numTicks={!isHorizontal && !yValueLabels ? 5 : undefined}
            tickFormat={
              isHorizontal
                ? (v) => truncateLabel(String(v))
                : (yValueLabels ? (v) => truncateLabel(yValueLabels[v as number] ?? '') : undefined)
            }
          />
          <AxisBottom
            top={yMax}
            scale={isHorizontal ? valueScale : categoryScale}
            stroke="currentColor"
            tickStroke="currentColor"
            tickValues={isHorizontal ? undefined : filteredXTickValues}
            tickLabelProps={{
              className: 'fill-foreground',
              fontSize: 10,
              textAnchor: isExpanded ? ('middle' as const) : ('end' as const),
              angle: isExpanded ? 0 : -45,
              dx: isExpanded ? 0 : -4,
              dy: isExpanded ? 0 : 4
            }}
            numTicks={isHorizontal ? 5 : undefined}
            tickFormat={
              isHorizontal && yValueLabels
                ? (v) => truncateLabel(yValueLabels[v as number] ?? '')
                : (v) => truncateLabel(String(v))
            }
          />
          {/* X Axis Label */}
          {(isHorizontal ? yLabel : xLabel) && (
            <text
              x={xMax / 2}
              y={yMax + (isExpanded ? 35 : 65)}
              textAnchor="middle"
              className="fill-foreground"
              fontSize={11}
            >
              {isHorizontal ? yLabel : xLabel}
            </text>
          )}
          {/* Y Axis Label */}
          {(isHorizontal ? xLabel : yLabel) && (
            <text
              x={-yMax / 2}
              y={-(margin.left - 10)}
              textAnchor="middle"
              transform="rotate(-90)"
              className="fill-foreground"
              fontSize={11}
            >
              {isHorizontal ? xLabel : yLabel}
            </text>
          )}
          {/* Brush for selection - only in widget mode, not expanded, vertical only */}
          {enableBrush && !zoomState && !isHorizontal && (
            <Brush
              innerRef={brushRef}
              xScale={brushScale}
              yScale={valueScale}
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
                fill: 'url(#brush-pattern-bar)',
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

export function VisxBarChartWidget({
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

  // Fetch query data using shared hook
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
          {({ width, height }) => {
            const isHorizontal = (settings.orientation ?? 'vertical') === 'horizontal'
            // Calculate minimum size needed for readable labels
            const perBarSize = 35
            const margin = 120 // Account for axis labels and padding
            const minSize = displayDataCount * perBarSize + margin

            // Determine if scrolling is needed
            const needsHorizontalScroll = !isHorizontal && minSize > width
            const needsVerticalScroll = isHorizontal && minSize > height

            const containerWidth = needsHorizontalScroll ? minSize : width
            const containerHeight = needsVerticalScroll ? minSize : height

            const scrollClass = needsVerticalScroll
              ? 'overflow-y-auto overflow-x-hidden'
              : needsHorizontalScroll
                ? 'overflow-x-auto overflow-y-hidden'
                : ''

            return (
              <div className={`h-full w-full ${scrollClass}`}>
                <div style={{ width: containerWidth, height: containerHeight, minHeight: needsVerticalScroll ? containerHeight : '100%' }}>
                  <BarChart
                    data={chartResult.data}
                    width={containerWidth}
                    height={containerHeight}
                    showGrid={settings.showGrid ?? true}
                    colors={colors}
                    yValueLabels={chartResult.yValueLabels}
                    xLabel={settings.xAxisField}
                    yLabel={settings.yAxisField}
                    orientation={settings.orientation ?? 'vertical'}
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
