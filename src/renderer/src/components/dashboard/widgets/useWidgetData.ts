/**
 * Hook for fetching widget data
 * Supports both saved queries (queryId) and custom SQL queries
 *
 * Optimized to:
 * - Use a single query when custom SQL is provided
 * - Share saved queries cache across widgets via staleTime
 * - Prevent unnecessary re-fetches with proper query key design
 * - Avoid redundant query runs by using stable query keys
 */

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { dbdeskClient } from '@renderer/api/client'
import type { SavedQuery, Widget } from '@common/types'

interface UseWidgetDataOptions {
  limit?: number
  /** Skip fetching - useful when data is already available from parent */
  enabled?: boolean
}

/**
 * Check if a query is a SELECT/projection query that returns data
 */
function isSelectQuery(query: string): boolean {
  const normalized = query.trim().toLowerCase()
  // Allow SELECT, WITH (CTE), SHOW, DESCRIBE, EXPLAIN queries
  return (
    normalized.startsWith('select') ||
    normalized.startsWith('with') ||
    normalized.startsWith('show') ||
    normalized.startsWith('describe') ||
    normalized.startsWith('explain') ||
    normalized.startsWith('table') // PostgreSQL TABLE command
  )
}

export function useWidgetData(
  widget: Widget,
  connectionId: string,
  options: UseWidgetDataOptions = {}
) {
  const { queryId, customQuery } = widget
  const { limit = 1000, enabled: externalEnabled = true } = options

  // Determine if we have any query configured
  const hasCustomQuery = !!customQuery?.trim()
  const hasSavedQuery = !!queryId && !hasCustomQuery
  const hasQuery = hasCustomQuery || hasSavedQuery

  // Only fetch saved queries if we need them (no custom query and has queryId)
  const savedQueriesQuery = useQuery({
    queryKey: ['saved-queries', connectionId],
    queryFn: () => dbdeskClient.loadQueries(connectionId),
    enabled: externalEnabled && !!connectionId && hasSavedQuery,
    staleTime: 60_000, // 1 minute - cached across widgets
    gcTime: 5 * 60_000, // Keep in cache for 5 minutes
    retry: false, // Consistent with SavedQueriesWidget and other observers on this key
    refetchOnWindowFocus: false
  })

  // Memoize the resolved query content to prevent unnecessary recalculations
  const resolvedQueryContent = useMemo(() => {
    if (hasCustomQuery && customQuery) {
      return customQuery.trim()
    }
    if (hasSavedQuery && queryId && savedQueriesQuery.data) {
      const savedQuery = savedQueriesQuery.data.find((q: SavedQuery) => q.id === queryId)
      return savedQuery?.content ?? null
    }
    return null
  }, [hasCustomQuery, customQuery, hasSavedQuery, queryId, savedQueriesQuery.data])

  // Determine if we can run the widget query
  const canRunQuery = externalEnabled && !!connectionId && !!resolvedQueryContent

  const queryResult = useQuery({
    // Use widget.id in key to ensure each widget has its own cache entry
    // Include resolvedQueryContent hash to re-run when query changes
    queryKey: ['widget-data', widget.id, connectionId, resolvedQueryContent, limit],
    queryFn: async () => {
      if (!resolvedQueryContent) {
        return null
      }

      // Validate that it's a SELECT query
      if (!isSelectQuery(resolvedQueryContent)) {
        throw new Error(
          'Only SELECT queries are allowed for widgets. INSERT, UPDATE, DELETE, and other data modification queries cannot be used.'
        )
      }

      return dbdeskClient.runQuery(connectionId, resolvedQueryContent, { limit })
    },
    enabled: hasQuery && canRunQuery,
    staleTime: 30_000, // 30 seconds before considered stale
    gcTime: 5 * 60_000, // Keep in cache for 5 minutes
    retry: false,
    refetchOnWindowFocus: false
  })

  return {
    ...queryResult,
    hasQuery
  }
}
