import type { SqlParameter, TableFilterCondition, TableFilterIsValue } from '@common/types/sql'

/**
 * Escapes and quotes an identifier for safe use in MySQL queries
 * MySQL uses backticks for identifier quoting
 */
export function quoteIdentifier(identifier: string): string {
  return `\`${identifier.replace(/`/g, '``')}\``
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
 * MySQL uses ? for positional parameters
 */
export function buildWhereClause(
  filters: TableFilterCondition[] | undefined,
  params: SqlParameter[]
): { clause?: string } {
  if (!filters || filters.length === 0) {
    return {}
  }

  const clauses: string[] = []

  for (const filter of filters) {
    const column = quoteIdentifier(filter.column)

    switch (filter.operator) {
      case 'IN': {
        if (!filter.value.length) {
          continue
        }
        const placeholders = filter.value.map(() => '?').join(', ')
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
        params.push(filter.value)
        clauses.push(`${column} ${filter.operator} ?`)
      }
    }
  }

  return {
    clause: clauses.length > 0 ? clauses.join(' AND ') : undefined
  }
}
