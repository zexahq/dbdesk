// SQL Queries for database introspection and operations

import type { SqlParameter, TableDataOptions } from '@common/types/sql'
import { buildWhereClause, quoteIdentifier } from './utils'

export const QUERIES = {
  // Connection validation
  TEST_CONNECTION: 'SELECT 1',

  // Schema queries
  LIST_SCHEMAS: `
    SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
    ORDER BY schema_name
  `,

  // Table queries
  LIST_TABLES: `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = $1
    ORDER BY table_name
  `,

  // Schema with tables query
  LIST_SCHEMAS_WITH_TABLES: `
    SELECT
      s.schema_name,
      COALESCE(array_agg(t.table_name ORDER BY t.table_name) FILTER (WHERE t.table_name IS NOT NULL), ARRAY[]::text[]) AS tables
    FROM information_schema.schemata s
    LEFT JOIN information_schema.tables t
      ON s.schema_name = t.table_schema
      AND t.table_type = 'BASE TABLE'
    WHERE s.schema_name NOT IN ('pg_catalog', 'information_schema')
    GROUP BY s.schema_name
    ORDER BY s.schema_name
  `,

  // Column queries
  LIST_COLUMNS: `
    SELECT
      c.column_name,
      c.data_type,
      c.is_nullable,
      c.column_default,
      CASE
        WHEN tc.constraint_type = 'PRIMARY KEY' THEN TRUE
        ELSE FALSE
      END AS is_primary_key
    FROM information_schema.columns c
    LEFT JOIN information_schema.key_column_usage kcu
      ON c.table_schema = kcu.table_schema
      AND c.table_name = kcu.table_name
      AND c.column_name = kcu.column_name
    LEFT JOIN information_schema.table_constraints tc
      ON kcu.constraint_name = tc.constraint_name
      AND kcu.table_schema = tc.table_schema
      AND kcu.table_name = tc.table_name
      AND tc.constraint_type = 'PRIMARY KEY'
    WHERE c.table_schema = $1
      AND c.table_name = $2
    ORDER BY c.ordinal_position
  `,

  // Constraint queries
  LIST_CONSTRAINTS: `
    SELECT
      tc.constraint_name,
      tc.constraint_type,
      array_agg(kcu.column_name ORDER BY kcu.ordinal_position) FILTER (WHERE kcu.column_name IS NOT NULL) AS columns,
      ccu.table_schema AS foreign_table_schema,
      ccu.table_name AS foreign_table_name,
      array_agg(ccu.column_name) FILTER (WHERE ccu.column_name IS NOT NULL) AS foreign_columns
    FROM information_schema.table_constraints tc
    LEFT JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
      AND tc.table_name = kcu.table_name
    LEFT JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
      AND tc.table_schema = ccu.table_schema
    WHERE tc.table_schema = $1
      AND tc.table_name = $2
    GROUP BY
      tc.constraint_name, tc.constraint_type, ccu.table_schema, ccu.table_name
    ORDER BY tc.constraint_name
  `,

  // Index queries
  LIST_INDEXES: `
    SELECT
      idx.relname AS index_name,
      array_agg(att.attname ORDER BY ord.ordinality) AS column_names,
      i.indisunique AS is_unique
    FROM pg_class AS tbl
    JOIN pg_namespace AS ns ON ns.oid = tbl.relnamespace
    JOIN pg_index AS i ON i.indrelid = tbl.oid
    JOIN pg_class AS idx ON idx.oid = i.indexrelid
    JOIN LATERAL unnest(i.indkey) WITH ORDINALITY AS ord(attnum, ordinality) ON true
    JOIN pg_attribute AS att ON att.attrelid = tbl.oid AND att.attnum = ord.attnum
    WHERE ns.nspname = $1
      AND tbl.relname = $2
    GROUP BY idx.relname, i.indisunique
    ORDER BY idx.relname
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
  let paramCount = 1

  const { clause, nextIndex } = buildWhereClause(filters, params, paramCount)
  paramCount = nextIndex

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
  query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`
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
  let paramCount = 1

  const { clause } = buildWhereClause(filters, params, paramCount)

  if (clause) {
    query += ` WHERE ${clause}`
  }

  return { query, params }
}
