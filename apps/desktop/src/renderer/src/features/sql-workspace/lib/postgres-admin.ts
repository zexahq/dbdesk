export const ACTIVITY_SQL = `
SELECT
  a.pid,
  a.usename,
  a.datname,
  a.state,
  a.query_start,
  CASE
    WHEN a.state = 'active' THEN clock_timestamp() - a.query_start
    ELSE clock_timestamp() - a.state_change
  END AS state_duration,
  a.wait_event_type,
  a.wait_event,
  pg_blocking_pids(a.pid) AS blocked_by,
  a.query
FROM pg_stat_activity a
WHERE a.pid <> pg_backend_pid() AND a.backend_type = 'client backend'
ORDER BY cardinality(pg_blocking_pids(a.pid)) DESC, a.query_start NULLS LAST`

export const ROLES_SQL = `
SELECT rolname, rolsuper, rolcreaterole, rolcreatedb, rolcanlogin, rolreplication,
       rolconnlimit, rolvaliduntil
FROM pg_roles
ORDER BY rolname`

export const MEMBERSHIPS_SQL = `
SELECT role.rolname AS role_name, member.rolname AS member_name,
       grantor.rolname AS grantor_name, membership.admin_option,
       coalesce((to_jsonb(membership)->>'inherit_option')::boolean, true) AS inherit_option,
       coalesce((to_jsonb(membership)->>'set_option')::boolean, true) AS set_option
FROM pg_auth_members membership
JOIN pg_roles role ON role.oid = membership.roleid
JOIN pg_roles member ON member.oid = membership.member
JOIN pg_roles grantor ON grantor.oid = membership.grantor
ORDER BY role.rolname, member.rolname`

export const GRANTS_SQL = `
WITH object_grants AS (
  SELECT
    CASE WHEN object.relkind = 'S' THEN 'sequence' ELSE 'table' END AS object_type,
    ns.nspname AS schema_name,
    object.relname AS object_name,
    grant_item.grantee,
    grant_item.privilege_type,
    grant_item.is_grantable
  FROM pg_class object
  JOIN pg_namespace ns ON ns.oid = object.relnamespace
  CROSS JOIN LATERAL aclexplode(
    coalesce(
      object.relacl,
      acldefault((CASE WHEN object.relkind = 'S' THEN 's' ELSE 'r' END)::"char", object.relowner)
    )
  ) grant_item
  WHERE object.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')
    AND ns.nspname NOT IN ('pg_catalog', 'information_schema')
  UNION ALL
  SELECT 'routine', ns.nspname, routine.proname, grant_item.grantee,
         grant_item.privilege_type, grant_item.is_grantable
  FROM pg_proc routine
  JOIN pg_namespace ns ON ns.oid = routine.pronamespace
  CROSS JOIN LATERAL aclexplode(coalesce(routine.proacl, acldefault('f', routine.proowner))) grant_item
  WHERE ns.nspname NOT IN ('pg_catalog', 'information_schema')
  UNION ALL
  SELECT 'schema', NULL, ns.nspname, grant_item.grantee,
         grant_item.privilege_type, grant_item.is_grantable
  FROM pg_namespace ns
  CROSS JOIN LATERAL aclexplode(coalesce(ns.nspacl, acldefault('n', ns.nspowner))) grant_item
  WHERE ns.nspname NOT IN ('pg_catalog', 'information_schema')
  UNION ALL
  SELECT 'database', NULL, database.datname, grant_item.grantee,
         grant_item.privilege_type, grant_item.is_grantable
  FROM pg_database database
  CROSS JOIN LATERAL aclexplode(coalesce(database.datacl, acldefault('d', database.datdba))) grant_item
)
SELECT object_type, schema_name, object_name,
       CASE WHEN grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(grantee) END AS grantee,
       privilege_type, is_grantable
FROM object_grants
ORDER BY object_type, schema_name NULLS FIRST, object_name, grantee, privilege_type`

export const POLICIES_SQL = `
SELECT
  ns.nspname AS schemaname,
  tbl.relname AS tablename,
  tbl.relrowsecurity AS rls_enabled,
  tbl.relforcerowsecurity AS rls_forced,
  policy.policyname,
  policy.permissive,
  policy.roles,
  policy.cmd,
  policy.qual,
  policy.with_check
FROM pg_class tbl
JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
LEFT JOIN pg_policies policy
  ON policy.schemaname = ns.nspname AND policy.tablename = tbl.relname
WHERE tbl.relkind IN ('r', 'p')
  AND ns.nspname NOT IN ('pg_catalog', 'information_schema')
  AND (tbl.relrowsecurity OR policy.policyname IS NOT NULL)
ORDER BY ns.nspname, tbl.relname, policy.policyname`

export const TABLE_HEALTH_SQL = `
SELECT
  schemaname,
  relname AS table_name,
  n_live_tup AS estimated_rows,
  n_dead_tup AS dead_rows,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze,
  pg_size_pretty(pg_total_relation_size(format('%I.%I', schemaname, relname)::regclass)) AS total_size
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(format('%I.%I', schemaname, relname)::regclass) DESC`

export const INDEX_HEALTH_SQL = `
SELECT
  schemaname,
  relname AS table_name,
  indexrelname AS index_name,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
  primary_index,
  unique_index,
  (idx_scan = 0 AND NOT primary_index AND NOT unique_index) AS unused_candidate
FROM pg_stat_user_indexes
JOIN LATERAL (
  SELECT i.indisprimary AS primary_index, i.indisunique AS unique_index
  FROM pg_index i WHERE i.indexrelid = pg_stat_user_indexes.indexrelid
) index_flags ON true
ORDER BY pg_relation_size(indexrelid) DESC`

export const DUPLICATE_INDEXES_SQL = `
SELECT
  ns.nspname AS schemaname,
  tbl.relname AS table_name,
  array_agg(idx.relname ORDER BY idx.relname) AS duplicate_indexes
FROM pg_index i
JOIN pg_class idx ON idx.oid = i.indexrelid
JOIN pg_class tbl ON tbl.oid = i.indrelid
JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
WHERE ns.nspname NOT IN ('pg_catalog', 'information_schema')
GROUP BY ns.nspname, tbl.relname, i.indrelid, i.indkey, i.indclass, i.indcollation,
         i.indoption, i.indisunique, i.indisprimary, i.indexprs::text, i.indpred::text
HAVING count(*) > 1
ORDER BY ns.nspname, tbl.relname`

export const STAT_STATEMENTS_AVAILABLE_SQL = `
SELECT ns.nspname AS schema_name
FROM pg_extension extension
JOIN pg_namespace ns ON ns.oid = extension.extnamespace
WHERE extension.extname = 'pg_stat_statements'`

export const buildTopQueriesSql = (schema: string): string => `
SELECT calls, rows, total_exec_time, mean_exec_time, query
FROM ${quoteIdentifier(schema)}.pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 50`

export type PolicyCommand = 'ALL' | 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'

export type AdminSqlAction =
  | { kind: 'create-role'; role: string; login: boolean }
  | {
      kind: 'alter-role'
      role: string
      attribute: 'LOGIN' | 'CREATEDB' | 'CREATEROLE'
      enabled: boolean
    }
  | { kind: 'drop-role'; role: string }
  | { kind: 'grant-role'; role: string; member: string }
  | { kind: 'revoke-role'; role: string; member: string }
  | {
      kind: 'grant-table'
      privilege: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL'
      schema: string
      table: string
      role: string
    }
  | {
      kind: 'revoke-table'
      privilege: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL'
      schema: string
      table: string
      role: string
    }
  | {
      kind: 'set-rls'
      mode: 'ENABLE' | 'DISABLE' | 'FORCE' | 'NO FORCE'
      schema: string
      table: string
    }
  | {
      kind: 'create-policy'
      name: string
      schema: string
      table: string
      command: PolicyCommand
      role: string
      using?: string
      check?: string
    }
  | {
      kind: 'alter-policy'
      name: string
      schema: string
      table: string
      command: PolicyCommand
      role: string
      using?: string
      check?: string
    }
  | { kind: 'drop-policy'; name: string; schema: string; table: string }
  | {
      kind: 'maintenance'
      operation: 'VACUUM (ANALYZE)' | 'ANALYZE' | 'REINDEX TABLE'
      schema: string
      table: string
    }
  | { kind: 'backend'; operation: 'cancel' | 'terminate'; pid: number }

export const quoteIdentifier = (value: string): string => {
  const trimmed = value.trim()
  if (!trimmed) throw new Error('Identifier is required')
  if (trimmed.includes('\0')) throw new Error('Identifier cannot contain null bytes')
  return `"${trimmed.replaceAll('"', '""')}"`
}

const sqlExpression = (value: string): string => {
  const trimmed = value.trim()
  if (/;|--|\/\*|\*\/|\0/.test(trimmed)) {
    throw new Error('Policy expressions cannot contain statement separators or comments')
  }
  return trimmed
}

const roleTarget = (role: string): string =>
  role.trim() === 'PUBLIC' ? 'PUBLIC' : quoteIdentifier(role)

const policyClauses = (
  command: PolicyCommand,
  usingExpression?: string,
  checkExpression?: string
): string => {
  if (command === 'INSERT' && usingExpression?.trim()) {
    throw new Error('INSERT policies cannot have a USING expression')
  }
  if ((command === 'SELECT' || command === 'DELETE') && checkExpression?.trim()) {
    throw new Error(`${command} policies cannot have a WITH CHECK expression`)
  }

  const using = usingExpression?.trim() ? ` USING (${sqlExpression(usingExpression)})` : ''
  const check = checkExpression?.trim() ? ` WITH CHECK (${sqlExpression(checkExpression)})` : ''
  return `${using}${check}`
}

export const buildAdminSql = (action: AdminSqlAction): string => {
  switch (action.kind) {
    case 'create-role':
      return `CREATE ROLE ${quoteIdentifier(action.role)}${action.login ? ' LOGIN' : ''}`
    case 'alter-role':
      return `ALTER ROLE ${quoteIdentifier(action.role)} ${action.enabled ? action.attribute : `NO${action.attribute}`}`
    case 'drop-role':
      return `DROP ROLE ${quoteIdentifier(action.role)}`
    case 'grant-role':
      return `GRANT ${quoteIdentifier(action.role)} TO ${quoteIdentifier(action.member)}`
    case 'revoke-role':
      return `REVOKE ${quoteIdentifier(action.role)} FROM ${quoteIdentifier(action.member)}`
    case 'grant-table':
      return `GRANT ${action.privilege} ON TABLE ${quoteIdentifier(action.schema)}.${quoteIdentifier(action.table)} TO ${roleTarget(action.role)}`
    case 'revoke-table':
      return `REVOKE ${action.privilege} ON TABLE ${quoteIdentifier(action.schema)}.${quoteIdentifier(action.table)} FROM ${roleTarget(action.role)}`
    case 'set-rls':
      return `ALTER TABLE ${quoteIdentifier(action.schema)}.${quoteIdentifier(action.table)} ${action.mode} ROW LEVEL SECURITY`
    case 'create-policy': {
      return `CREATE POLICY ${quoteIdentifier(action.name)} ON ${quoteIdentifier(action.schema)}.${quoteIdentifier(action.table)} FOR ${action.command} TO ${roleTarget(action.role)}${policyClauses(action.command, action.using, action.check)}`
    }
    case 'alter-policy': {
      return `ALTER POLICY ${quoteIdentifier(action.name)} ON ${quoteIdentifier(action.schema)}.${quoteIdentifier(action.table)} TO ${roleTarget(action.role)}${policyClauses(action.command, action.using, action.check)}`
    }
    case 'drop-policy':
      return `DROP POLICY ${quoteIdentifier(action.name)} ON ${quoteIdentifier(action.schema)}.${quoteIdentifier(action.table)}`
    case 'maintenance':
      return `${action.operation} ${quoteIdentifier(action.schema)}.${quoteIdentifier(action.table)}`
    case 'backend': {
      if (!Number.isSafeInteger(action.pid) || action.pid <= 0)
        throw new Error('Invalid backend PID')
      const fn = action.operation === 'cancel' ? 'pg_cancel_backend' : 'pg_terminate_backend'
      return `SELECT ${fn}(${action.pid})`
    }
  }
}
