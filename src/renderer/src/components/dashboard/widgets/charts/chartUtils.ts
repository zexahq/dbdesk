/**
 * Shared chart data transformation utilities
 * Eliminates duplicate code across chart widgets
 */

import type { QueryResult } from '@common/types'

export interface ChartDataPoint {
  label: string
  value: number
  rawValue: string | number
}

export interface ChartResult {
  data: ChartDataPoint[]
  yValueLabels: string[] | null // null means numeric values, array means categorical
}

/**
 * Transform query data for charts with X and Y axis fields
 * Handles both numeric and categorical Y values
 */
export function transformChartData(
  queryData: QueryResult | null | undefined,
  xAxisField: string | undefined,
  yAxisField: string | undefined
): ChartResult {
  if (!queryData?.rows?.length || !xAxisField || !yAxisField) {
    return { data: [], yValueLabels: null }
  }

  // Check if Y values are categorical (non-numeric strings)
  const yValues = queryData.rows.map((row) => (row as Record<string, unknown>)[yAxisField])
  const hasNonNumericY = yValues.some((v) => {
    if (typeof v === 'number') return false
    return isNaN(parseFloat(String(v)))
  })

  const uniqueYValues = [...new Set(yValues.map((v) => String(v)))]
  const categoryMap = new Map(uniqueYValues.map((v, i) => [v, i]))

  const data = queryData.rows.map((row) => {
    const record = row as Record<string, unknown>
    const rawValue = record[yAxisField]
    let value: number

    if (typeof rawValue === 'number') {
      value = hasNonNumericY ? (categoryMap.get(String(rawValue)) ?? 0) : rawValue
    } else {
      const parsed = parseFloat(String(rawValue))
      value = isNaN(parsed)
        ? (categoryMap.get(String(rawValue)) ?? 0)
        : hasNonNumericY
          ? (categoryMap.get(String(rawValue)) ?? 0)
          : parsed
    }

    return {
      label: String(record[xAxisField] ?? ''),
      value,
      rawValue: typeof rawValue === 'number' ? rawValue : String(rawValue ?? '')
    }
  })

  return {
    data,
    yValueLabels: hasNonNumericY ? uniqueYValues : null
  }
}
