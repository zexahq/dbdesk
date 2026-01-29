/**
 * Hook for fetching widget data
 * Supports both saved queries (queryId) and custom SQL queries
 */

import { useQuery } from '@tanstack/react-query'
import { dbdeskClient } from '@renderer/api/client'
import type { Widget } from '../types'

interface UseWidgetDataOptions {
  limit?: number
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
  const { limit = 1000 } = options

  const hasQuery = !!queryId || !!customQuery?.trim()

  const queryResult = useQuery({
    queryKey: ['widget-data', connectionId, queryId, customQuery, limit],
    queryFn: async () => {
      let queryContent: string | null = null

      // If custom query is provided, use it directly
      if (customQuery?.trim()) {
        queryContent = customQuery.trim()
      } else if (queryId) {
        // Otherwise, look up the saved query
        const queries = await dbdeskClient.loadQueries(connectionId)
        const savedQuery = queries.find((q) => q.id === queryId)
        if (!savedQuery) {
          throw new Error('Query not found')
        }
        queryContent = savedQuery.content
      }

      if (!queryContent) {
        return null
      }

      // Validate that it's a SELECT query
      if (!isSelectQuery(queryContent)) {
        throw new Error(
          'Only SELECT queries are allowed for widgets. INSERT, UPDATE, DELETE, and other data modification queries cannot be used.'
        )
      }

      const result = await dbdeskClient.runQuery(connectionId, queryContent, { limit })
      return result
    },
    enabled: hasQuery && !!connectionId
  })

  return {
    ...queryResult,
    hasQuery
  }
}
