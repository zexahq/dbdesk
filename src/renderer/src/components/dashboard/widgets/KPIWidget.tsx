/**
 * KPI Widget Component
 * Displays a single key performance indicator with optional comparison
 */

import { Pencil, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { cn } from '@renderer/lib/utils'
import type { KPIWidgetSettings, WidgetComponentProps } from '../types'
import { KPIPlaceholder } from './placeholders'
import { useWidgetData } from './useWidgetData'

export function KPIWidget({
  widget,
  connectionId,
  isEditMode,
  onEdit,
  onDelete,
  onRefresh
}: WidgetComponentProps<KPIWidgetSettings>) {
  const { settings, title } = widget

  // Fetch query data using shared hook
  const {
    data: queryData,
    isLoading,
    error,
    refetch,
    hasQuery
  } = useWidgetData(widget, connectionId, { limit: 1 })

  // Extract the value from query results
  const getValue = (): string | number => {
    if (!queryData?.rows?.length || !settings.valueField) {
      return '—'
    }
    const row = queryData.rows[0] as Record<string, unknown>
    const rawValue = row[settings.valueField]

    if (rawValue === null || rawValue === undefined) {
      return '—'
    }

    const numValue = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue))

    if (isNaN(numValue)) {
      return String(rawValue)
    }

    return formatValue(numValue)
  }

  // Format value based on settings
  const formatValue = (value: number): string => {
    const decimals = settings.decimals ?? 0

    switch (settings.formatType) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        }).format(value)

      case 'percentage':
        return `${value.toFixed(decimals)}%`

      case 'number':
      default:
        return new Intl.NumberFormat('en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        }).format(value)
    }
  }

  // Get comparison value if configured
  const getCompareValue = (): { value: string; positive: boolean } | null => {
    if (!queryData?.rows?.length || !settings.compareField) {
      return null
    }
    const row = queryData.rows[0] as Record<string, unknown>
    const rawValue = row[settings.compareField]

    if (rawValue === null || rawValue === undefined) {
      return null
    }

    const numValue = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue))

    if (isNaN(numValue)) {
      return null
    }

    return {
      value: `${numValue >= 0 ? '+' : ''}${numValue.toFixed(settings.decimals ?? 0)}%`,
      positive: numValue >= 0
    }
  }

  const handleRefresh = () => {
    refetch()
    onRefresh?.()
  }

  const displayValue = getValue()
  const compareValue = getCompareValue()

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
      <CardContent className="flex-1 flex flex-col justify-center">
        {isLoading ? (
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-24" />
          </div>
        ) : error ? (
          <div className="text-sm text-destructive">
            {error instanceof Error ? error.message : 'Failed to load data'}
          </div>
        ) : !hasQuery || !settings.valueField ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <KPIPlaceholder />
            <p className="text-xs text-muted-foreground text-center mt-2">
              {!hasQuery ? 'Select a query' : 'Configure value field'}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="text-2xl font-bold tracking-tight">
              {settings.prefix}
              {displayValue}
              {settings.suffix}
            </div>
            {compareValue && (
              <div className="flex items-center gap-1 text-xs">
                <span
                  className={cn(
                    'font-medium',
                    compareValue.positive ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {compareValue.value}
                </span>
                {settings.compareLabel && (
                  <span className="text-muted-foreground">{settings.compareLabel}</span>
                )}
              </div>
            )}
            {settings.labelField && queryData?.rows?.[0] && (
              <p className="text-xs text-muted-foreground">
                {String((queryData.rows[0] as Record<string, unknown>)[settings.labelField] ?? '')}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
