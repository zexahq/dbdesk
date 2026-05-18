/**
 * KPI Widget Component
 * Displays a single key performance indicator with optional comparison
 */

import { useCallback, useMemo } from 'react'
import type { KPIWidgetSettings } from '@common/types'
import { cn } from '@renderer/lib/utils'
import type { WidgetComponentProps } from '@renderer/types/dashboard'
import { KPIPlaceholder } from './placeholders'
import { useWidgetData } from './useWidgetData'
import { WidgetWrapper } from './WidgetWrapper'

/**
 * Format a number based on format type and decimals
 */
function formatValue(value: number, formatType: string | undefined, decimals: number): string {
  switch (formatType) {
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

export function KPIWidget({
  widget,
  connectionId,
  isEditMode,
  isExpanded,
  onEdit,
  onDelete,
  onRefresh,
  onExpand
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

  const decimals = settings.decimals ?? 0

  // Memoize the display value computation
  const displayValue = useMemo((): string | number => {
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

    return formatValue(numValue, settings.formatType, decimals)
  }, [queryData?.rows, settings.valueField, settings.formatType, decimals])

  // Memoize the comparison value computation
  const compareValue = useMemo((): { value: string; positive: boolean } | null => {
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
      value: `${numValue >= 0 ? '+' : ''}${numValue.toFixed(decimals)}%`,
      positive: numValue >= 0
    }
  }, [queryData?.rows, settings.compareField, decimals])

  const handleRefresh = useCallback(() => {
    refetch()
    onRefresh?.()
  }, [refetch, onRefresh])

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
      loadingContent={
        <div className="flex-1 flex flex-col justify-center">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-24" />
          </div>
        </div>
      }
    >
      {!hasQuery || !settings.valueField ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <KPIPlaceholder />
          <p className="text-xs text-muted-foreground text-center mt-2">
            {!hasQuery ? 'Select a query' : 'Configure value field'}
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-center space-y-1">
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
    </WidgetWrapper>
  )
}
