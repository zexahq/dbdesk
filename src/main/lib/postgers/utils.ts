import type { SqlParameter, TableFilterCondition, TableFilterIsValue } from '@common/types/sql'

/**
 * Escapes and quotes an identifier for safe use in SQL queries
 */
export function quoteIdentifier(identifier: string): string {
  if (typeof identifier !== 'string' || identifier.length === 0) {
    throw new Error(`Invalid SQL identifier: ${String(identifier)}`)
  }

  return `"${identifier.replace(/"/g, '""')}"`
}

/**
 * Parses a PostgreSQL array string into a JavaScript array
 * @param pgArray - PostgreSQL array string (e.g., "{value1,value2,value3}")
 * @returns Parsed array of strings, or empty array if input is null/empty
 */
export function parsePostgresArray(pgArray: string | null | undefined): string[] {
  if (!pgArray || pgArray === '{}') {
    return []
  }

  const arrayContent = pgArray.slice(1, -1) // Remove '{' and '}'
  if (!arrayContent.trim()) {
    return []
  }

  return arrayContent.split(',').map((v) => v.trim())
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
