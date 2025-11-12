import type { SqlParameter, TableFilterCondition, TableFilterIsValue } from '@common/types/sql'

/**
 * Quote a PostgreSQL identifier to prevent SQL injection and handle special characters
 */
export function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`
}

/**
 * Normalize IS operator values to SQL syntax
 */
export function normalizeIsValue(value: TableFilterIsValue): string {
  switch (value) {
    case 'NULL':
      return 'NULL'
    case 'NOT NULL':
      return 'NOT NULL'
    case 'TRUE':
      return 'TRUE'
    case 'FALSE':
      return 'FALSE'
  }
}

/**
 * Build a WHERE clause from filter conditions
 */
export function buildWhereClause(
  filters: TableFilterCondition[] | undefined,
  params: SqlParameter[],
  startIndex: number
): { clause?: string; nextIndex: number } {
  if (!filters || filters.length === 0) {
    return { nextIndex: startIndex }
  }

  const clauses: string[] = []
  let nextIndex = startIndex

  for (const filter of filters) {
    const column = quoteIdentifier(filter.column)

    switch (filter.operator) {
      case 'IN': {
        if (!filter.value.length) {
          continue
        }
        const placeholders = filter.value.map(() => `$${nextIndex++}`).join(', ')
        params.push(...filter.value)
        clauses.push(`${column} IN (${placeholders})`)
        break
      }
      case 'IS': {
        const value = normalizeIsValue(filter.value)
        clauses.push(`${column} IS ${value}`)
        break
      }
      default: {
        const placeholder = `$${nextIndex++}`
        params.push(filter.value)
        clauses.push(`${column} ${filter.operator} ${placeholder}`)
      }
    }
  }

  return {
    clause: clauses.length > 0 ? clauses.join(' AND ') : undefined,
    nextIndex
  }
}
