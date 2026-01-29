/**
 * Widget Placeholder Components
 * Demo/preview content for widgets when no data is configured
 * All placeholders are 50% opacity and use neutral/grayscale colors
 */

import { Group } from '@visx/group'
import { ParentSize } from '@visx/responsive'
import { scaleBand, scaleLinear, scaleOrdinal, scalePoint } from '@visx/scale'
import { Bar, LinePath, Pie } from '@visx/shape'
import { curveMonotoneX } from '@visx/curve'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@renderer/components/ui/table'

// Demo data for charts
const barDemoData = [
  { label: 'Mon', value: 45 },
  { label: 'Tue', value: 72 },
  { label: 'Wed', value: 58 },
  { label: 'Thu', value: 90 },
  { label: 'Fri', value: 65 }
]

const lineDemoData = [
  { label: 'Jan', value: 30 },
  { label: 'Feb', value: 45 },
  { label: 'Mar', value: 38 },
  { label: 'Apr', value: 52 },
  { label: 'May', value: 48 },
  { label: 'Jun', value: 65 }
]

const pieDemoData = [
  { label: 'Category A', value: 35 },
  { label: 'Category B', value: 25 },
  { label: 'Category C', value: 20 },
  { label: 'Category D', value: 12 },
  { label: 'Category E', value: 8 }
]

const scatterDemoData = [
  { x: 10, y: 25 },
  { x: 25, y: 45 },
  { x: 35, y: 35 },
  { x: 45, y: 60 },
  { x: 55, y: 52 },
  { x: 65, y: 70 },
  { x: 75, y: 65 },
  { x: 85, y: 80 }
]

const tableDemoData = [
  { id: 1, name: 'Item A', value: 1234, status: 'Active' },
  { id: 2, name: 'Item B', value: 5678, status: 'Pending' },
  { id: 3, name: 'Item C', value: 9012, status: 'Active' },
  { id: 4, name: 'Item D', value: 3456, status: 'Inactive' }
]

// Neutral gray color for placeholders
const placeholderColor = '#6b7280'

// KPI Placeholder - scales to fill container
export function KPIPlaceholder({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="opacity-50 p-2">
        <div className="text-lg font-bold text-muted-foreground">$12,345</div>
        <div className="flex items-center gap-1 mt-1">
          <span className="text-xs text-muted-foreground">+12.5%</span>
          <span className="text-xs text-muted-foreground/70">vs last month</span>
        </div>
      </div>
    )
  }

  return (
    <div className="opacity-50 h-full w-full flex flex-col items-center justify-center p-4">
      <div className="text-3xl md:text-4xl font-bold text-muted-foreground">$12,345</div>
      <div className="flex items-center gap-1 mt-2">
        <span className="text-sm text-muted-foreground">+12.5%</span>
        <span className="text-sm text-muted-foreground/70">vs last month</span>
      </div>
    </div>
  )
}

// Table Placeholder - fills container width
export function TablePlaceholder({ compact = false }: { compact?: boolean }) {
  const columns = ['ID', 'Name', 'Value', 'Status']
  const rows = compact ? tableDemoData.slice(0, 2) : tableDemoData

  return (
    <div className="opacity-50 w-full h-full overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col} className="text-xs text-muted-foreground">
                {col}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="text-xs text-muted-foreground">{row.id}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{row.name}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{row.value}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{row.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// Bar Chart Placeholder - responsive, fills container
export function BarChartPlaceholder({
  width,
  height
}: {
  width?: number
  height?: number
} = {}) {
  // If dimensions provided, render directly
  if (width && height) {
    return <BarChartSVG width={width} height={height} />
  }

  // Otherwise use ParentSize to fill container
  return (
    <div className="w-full h-full">
      <ParentSize>
        {({ width: w, height: h }) => <BarChartSVG width={w} height={h} />}
      </ParentSize>
    </div>
  )
}

// Internal SVG bar chart renderer
function BarChartSVG({ width, height }: { width: number; height: number }) {
  const margin = { top: 10, right: 10, bottom: 20, left: 30 }
  const xMax = width - margin.left - margin.right
  const yMax = height - margin.top - margin.bottom

  const xScale = scaleBand<string>({
    range: [0, xMax],
    domain: barDemoData.map((d) => d.label),
    padding: 0.3
  })

  const yScale = scaleLinear<number>({
    range: [yMax, 0],
    domain: [0, 100]
  })

  if (width < 50 || height < 50) return null

  return (
    <svg width={width} height={height} className="opacity-50">
      <Group left={margin.left} top={margin.top}>
        {barDemoData.map((d) => {
          const barWidth = xScale.bandwidth()
          const barHeight = yMax - (yScale(d.value) ?? 0)
          const barX = xScale(d.label) ?? 0
          const barY = yMax - barHeight

          return (
            <Bar
              key={d.label}
              x={barX}
              y={barY}
              width={barWidth}
              height={barHeight}
              fill={placeholderColor}
              rx={2}
            />
          )
        })}
      </Group>
    </svg>
  )
}

// Line Chart Placeholder - responsive
export function LineChartPlaceholder({
  width,
  height
}: {
  width?: number
  height?: number
} = {}) {
  if (width && height) {
    return <LineChartSVG width={width} height={height} />
  }

  return (
    <div className="w-full h-full">
      <ParentSize>
        {({ width: w, height: h }) => <LineChartSVG width={w} height={h} />}
      </ParentSize>
    </div>
  )
}

// Internal SVG line chart renderer
function LineChartSVG({ width, height }: { width: number; height: number }) {
  const margin = { top: 10, right: 10, bottom: 20, left: 30 }
  const xMax = width - margin.left - margin.right
  const yMax = height - margin.top - margin.bottom

  const xScale = scalePoint<string>({
    range: [0, xMax],
    domain: lineDemoData.map((d) => d.label),
    padding: 0.5
  })

  const yScale = scaleLinear<number>({
    range: [yMax, 0],
    domain: [0, 80]
  })

  if (width < 50 || height < 50) return null

  return (
    <svg width={width} height={height} className="opacity-50">
      <Group left={margin.left} top={margin.top}>
        <LinePath
          data={lineDemoData}
          x={(d) => xScale(d.label) ?? 0}
          y={(d) => yScale(d.value) ?? 0}
          stroke={placeholderColor}
          strokeWidth={2}
          curve={curveMonotoneX}
        />
        {lineDemoData.map((d, i) => (
          <circle
            key={i}
            cx={xScale(d.label) ?? 0}
            cy={yScale(d.value) ?? 0}
            r={3}
            fill={placeholderColor}
          />
        ))}
      </Group>
    </svg>
  )
}

// Pie Chart Placeholder - responsive
export function PieChartPlaceholder({
  width,
  height
}: {
  width?: number
  height?: number
} = {}) {
  if (width && height) {
    return <PieChartSVG width={width} height={height} />
  }

  return (
    <div className="w-full h-full">
      <ParentSize>
        {({ width: w, height: h }) => <PieChartSVG width={w} height={h} />}
      </ParentSize>
    </div>
  )
}

// Internal SVG pie chart renderer
function PieChartSVG({ width, height }: { width: number; height: number }) {
  const radius = Math.min(width, height) / 2 - 10
  const centerX = width / 2
  const centerY = height / 2

  const grayShades = ['#9ca3af', '#6b7280', '#4b5563', '#374151', '#1f2937']
  const colorScale = scaleOrdinal({
    domain: pieDemoData.map((d) => d.label),
    range: grayShades
  })

  if (width < 50 || height < 50 || radius < 15) return null

  return (
    <svg width={width} height={height} className="opacity-50">
      <Group top={centerY} left={centerX}>
        <Pie
          data={pieDemoData}
          pieValue={(d) => d.value}
          outerRadius={radius}
          innerRadius={radius * 0.5}
          padAngle={0.02}
        >
          {(pie) =>
            pie.arcs.map((arc, i) => (
              <path key={i} d={pie.path(arc) ?? ''} fill={colorScale(arc.data.label)} />
            ))
          }
        </Pie>
      </Group>
    </svg>
  )
}

// Scatter Chart Placeholder - responsive
export function ScatterChartPlaceholder({
  width,
  height
}: {
  width?: number
  height?: number
} = {}) {
  if (width && height) {
    return <ScatterChartSVG width={width} height={height} />
  }

  return (
    <div className="w-full h-full">
      <ParentSize>
        {({ width: w, height: h }) => <ScatterChartSVG width={w} height={h} />}
      </ParentSize>
    </div>
  )
}

// Internal SVG scatter chart renderer
function ScatterChartSVG({ width, height }: { width: number; height: number }) {
  const margin = { top: 10, right: 10, bottom: 20, left: 30 }
  const xMax = width - margin.left - margin.right
  const yMax = height - margin.top - margin.bottom

  const xScale = scaleLinear<number>({
    range: [0, xMax],
    domain: [0, 100]
  })

  const yScale = scaleLinear<number>({
    range: [yMax, 0],
    domain: [0, 100]
  })

  if (width < 50 || height < 50) return null

  return (
    <svg width={width} height={height} className="opacity-50">
      <Group left={margin.left} top={margin.top}>
        {scatterDemoData.map((d, i) => (
          <circle
            key={i}
            cx={xScale(d.x)}
            cy={yScale(d.y)}
            r={5}
            fill={placeholderColor}
          />
        ))}
      </Group>
    </svg>
  )
}

// Markdown Placeholder - fills container
export function MarkdownPlaceholder({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`opacity-50 ${compact ? 'p-2' : 'p-4 h-full'} space-y-2`}>
      <div className="h-3 bg-muted-foreground/30 rounded w-3/4" />
      <div className="h-2 bg-muted-foreground/20 rounded w-full" />
      <div className="h-2 bg-muted-foreground/20 rounded w-5/6" />
      {!compact && (
        <>
          <div className="h-2 bg-muted-foreground/20 rounded w-4/5" />
          <div className="h-2 bg-muted-foreground/20 rounded w-2/3" />
        </>
      )}
    </div>
  )
}

// Saved Queries Placeholder - fills container with query list preview
export function SavedQueriesPlaceholder({ compact = false }: { compact?: boolean }) {
  const items = compact ? 2 : 4

  return (
    <div className={`opacity-50 ${compact ? 'p-2' : 'p-4 h-full'} space-y-2`}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 p-2 rounded bg-muted-foreground/10">
          <div className="h-4 w-4 rounded bg-muted-foreground/30" />
          <div className="flex-1 space-y-1">
            <div className="h-2 bg-muted-foreground/30 rounded w-1/2" />
            <div className="h-1.5 bg-muted-foreground/20 rounded w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}
