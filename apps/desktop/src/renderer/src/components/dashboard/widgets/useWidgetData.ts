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
 * Check if a query is a SELECT/projection query that returns data.
 *
 * Note: this is a client-side UX guard only — the main process is the
 * authoritative boundary for query execution. CTEs (`WITH ...`) are
 * inspected because PostgreSQL allows data-modifying CTEs like
 * `WITH x AS (...) DELETE FROM ...`.
 */
function isSelectQuery(query: string): boolean {
  // Strip line + block comments and leading whitespace so leading
  // comments don't fool the prefix check.
  const stripped = query
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--.*$/gm, '')
    .trim()
    .toLowerCase()

  if (
    stripped.startsWith('select') ||
    stripped.startsWith('show') ||
    stripped.startsWith('describe') ||
    stripped.startsWith('explain') ||
    stripped.startsWith('table')
  ) {
    return true
  }

  // CTEs are only safe if they terminate in SELECT — reject WITH that
  // contains INSERT/UPDATE/DELETE/MERGE/TRUNCATE as the final statement.
  if (stripped.startsWith('with')) {
    return !/\b(insert|update|delete|merge|truncate|drop|alter|create)\b\s+(into\s+|from\s+|table\s+)?[a-z_"]/i.test(
      stripped
    )
  }

  return false
}

/**
 * Stable, cheap hash for a SQL string so the TanStack Query cache key
 * doesn't embed the entire query text (which bloats devtools and
 * comparisons for large widget queries).
 */
function hashQueryContent(content: string | null): string {
  if (!content) return ''
  // FNV-1a 32-bit
  let h = 0x811c9dc5
  for (let i = 0; i < content.length; i++) {
    h ^= content.charCodeAt(i)
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0
  }
  return `${content.length}:${h.toString(16)}`
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

  // Hash the query content so the cache key stays small even for large SQL.
  const queryHash = useMemo(() => hashQueryContent(resolvedQueryContent), [resolvedQueryContent])

  const queryResult = useQuery({
    // Use widget.id in key to ensure each widget has its own cache entry.
    // Include a hash of the query content to invalidate when the SQL changes
    // without bloating the cache key with the full query text.
    queryKey: ['widget-data', widget.id, connectionId, queryHash, limit],
    queryFn: async () => {
      if (!resolvedQueryContent) {
        return null
      }

      // Validate that it's a SELECT query
      if (!isSelectQuery(resolvedQueryContent)) {
        throw new Error(
          'Only read-only queries (SELECT / read-only CTE / SHOW / EXPLAIN) are allowed for widgets. Data-modifying queries cannot be used.'
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
