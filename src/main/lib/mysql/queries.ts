// SQL Queries for MySQL database introspection and operations

import type { SqlParameter, TableDataOptions } from '@common/types/sql'
import { buildWhereClause, quoteIdentifier } from './utils'

export const QUERIES = {
  // Connection validation
  TEST_CONNECTION: 'SELECT 1',

  // Schema queries - filter out system schemas
  LIST_SCHEMAS: `
    SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name NOT IN ('mysql', 'information_schema', 'performance_schema', 'sys')
    ORDER BY schema_name
  `,

  // Table queries
  LIST_TABLES: `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = ?
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `,

  // Schema with tables query - filters by connected database
  LIST_SCHEMAS_WITH_TABLES: `
    SELECT
      ? AS schema_name,
      COALESCE(
        JSON_ARRAYAGG(
          CASE WHEN t.table_name IS NOT NULL THEN t.table_name END
        ),
        JSON_ARRAY()
      ) AS tables
    FROM information_schema.tables t
    WHERE t.table_schema = ?
      AND t.table_type = 'BASE TABLE'
    GROUP BY t.table_schema
  `,

  // Column queries with primary key, foreign key, and enum metadata
  LIST_COLUMNS: `
    SELECT
      c.ordinal_position AS ordinal_position,
      c.column_name AS column_name,
      c.data_type AS data_type,
      c.column_type AS column_type,
      c.is_nullable AS is_nullable,
      c.column_default AS column_default,
      CASE WHEN kcu.constraint_name IS NOT NULL THEN 1 ELSE 0 END AS is_primary_key,
      fk_kcu.constraint_name AS fk_constraint_name,
      fk_kcu.referenced_table_schema AS referenced_table_schema,
      fk_kcu.referenced_table_name AS referenced_table_name,
      fk_kcu.referenced_column_name AS referenced_column_name,
      rc.delete_rule AS delete_rule,
      rc.update_rule AS update_rule,
      c.column_type AS enum_values
    FROM information_schema.columns c
    LEFT JOIN information_schema.key_column_usage kcu
      ON c.table_schema = kcu.table_schema
      AND c.table_name = kcu.table_name
      AND c.column_name = kcu.column_name
      AND kcu.constraint_name = 'PRIMARY'
    LEFT JOIN information_schema.key_column_usage fk_kcu
      ON c.table_schema = fk_kcu.table_schema
      AND c.table_name = fk_kcu.table_name
      AND c.column_name = fk_kcu.column_name
      AND fk_kcu.referenced_table_name IS NOT NULL
    LEFT JOIN information_schema.referential_constraints rc
      ON fk_kcu.constraint_name = rc.constraint_name
      AND fk_kcu.constraint_schema = rc.constraint_schema
    WHERE c.table_schema = ?
      AND c.table_name = ?
    ORDER BY c.ordinal_position
  `,

  // Constraint queries
  LIST_CONSTRAINTS: `
    SELECT
      tc.constraint_name,
      tc.constraint_type,
      GROUP_CONCAT(kcu.column_name ORDER BY kcu.ordinal_position) AS columns,
      kcu.referenced_table_schema AS foreign_table_schema,
      kcu.referenced_table_name AS foreign_table_name,
      GROUP_CONCAT(kcu.referenced_column_name) AS foreign_columns
    FROM information_schema.table_constraints tc
    LEFT JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
      AND tc.table_name = kcu.table_name
    WHERE tc.table_schema = ?
      AND tc.table_name = ?
    GROUP BY
      tc.constraint_name,
      tc.constraint_type,
      kcu.referenced_table_schema,
      kcu.referenced_table_name
    ORDER BY tc.constraint_name
  `,

  // Index queries
  LIST_INDEXES: `
    SELECT
      s.index_name,
      GROUP_CONCAT(s.column_name ORDER BY s.seq_in_index) AS column_names,
      CASE WHEN s.non_unique = 0 THEN 1 ELSE 0 END AS is_unique
    FROM information_schema.statistics s
    WHERE s.table_schema = ?
      AND s.table_name = ?
      AND s.index_name != 'PRIMARY'
    GROUP BY s.index_name, s.non_unique
    ORDER BY s.index_name
  `
}

/**
 * Build a SELECT query for fetching table data with filters and sorting
 */
export function buildTableDataQuery(options: TableDataOptions): {
  query: string
  params: SqlParameter[]
} {
  const { schema, table, filters, sortRules = [], limit = 50, offset = 0 } = options

  let query = `SELECT * FROM ${quoteIdentifier(schema)}.${quoteIdentifier(table)}`
  const params: SqlParameter[] = []

  const { clause } = buildWhereClause(filters, params)

  if (clause) {
    query += ` WHERE ${clause}`
  }

  // Add ORDER BY
  if (sortRules.length > 0) {
    const validRules = sortRules
      .filter((rule) => rule.column)
      .map(
        (rule) => `${quoteIdentifier(rule.column)} ${rule.direction === 'DESC' ? 'DESC' : 'ASC'}`
      )
    if (validRules.length > 0) {
      query += ` ORDER BY ${validRules.join(', ')}`
    }
  }

  // Add LIMIT and OFFSET
  query += ` LIMIT ? OFFSET ?`
  params.push(limit, offset)

  return { query, params }
}

/**
 * Build a COUNT query for getting total records
 */
export function buildTableCountQuery(
  options: Omit<TableDataOptions, 'sortRules' | 'limit' | 'offset'>
): {
  query: string
  params: SqlParameter[]
} {
  const { schema, table, filters } = options

  let query = `SELECT COUNT(*) as total FROM ${quoteIdentifier(schema)}.${quoteIdentifier(table)}`
  const params: SqlParameter[] = []

  const { clause } = buildWhereClause(filters, params)

  if (clause) {
    query += ` WHERE ${clause}`
  }

  return { query, params }
}

/**
 * Build an UPDATE query for updating a single cell in a table
 */
export function buildUpdateCellQuery(options: {
  schema: string
  table: string
  columnToUpdate: string
  newValue: unknown
  primaryKeyColumns: string[]
  primaryKeyValues: Record<string, unknown>
}): {
  query: string
  params: SqlParameter[]
} {
  const { schema, table, columnToUpdate, newValue, primaryKeyColumns, primaryKeyValues } = options

  const params: SqlParameter[] = []

  // Build SET clause
  const setClause = `${quoteIdentifier(columnToUpdate)} = ?`
  params.push(newValue as SqlParameter)

  // Build WHERE clause using primary keys
  const whereConditions = primaryKeyColumns.map((pkColumn) => {
    const value = primaryKeyValues[pkColumn]
    params.push(value as SqlParameter)
    return `${quoteIdentifier(pkColumn)} = ?`
  })

  const whereClause = whereConditions.join(' AND ')

  const query = `UPDATE ${quoteIdentifier(schema)}.${quoteIdentifier(table)} SET ${setClause} WHERE ${whereClause}`

  return { query, params }
}
