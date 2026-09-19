import { describe, expect, it } from 'vitest'
import {
  GRANTS_SQL,
  buildAdminSql,
  buildTopQueriesSql,
  quoteIdentifier
} from '../src/renderer/src/features/sql-workspace/lib/postgres-admin'

describe('PostgreSQL administration SQL', () => {
  it('quotes identifiers and builds only reviewed operations', () => {
    expect(quoteIdentifier('odd"role')).toBe('"odd""role"')
    expect(buildAdminSql({ kind: 'grant-role', role: 'writers', member: 'app user' })).toBe(
      'GRANT "writers" TO "app user"'
    )
    expect(
      buildAdminSql({
        kind: 'grant-table',
        privilege: 'UPDATE',
        schema: 'public',
        table: 'orders',
        role: 'writer'
      })
    ).toBe('GRANT UPDATE ON TABLE "public"."orders" TO "writer"')
    expect(
      buildAdminSql({
        kind: 'grant-table',
        privilege: 'SELECT',
        schema: 'public',
        table: 'orders',
        role: 'PUBLIC'
      })
    ).toBe('GRANT SELECT ON TABLE "public"."orders" TO PUBLIC')
    expect(
      buildAdminSql({
        kind: 'revoke-table',
        privilege: 'DELETE',
        schema: 'public',
        table: 'orders',
        role: 'PUBLIC'
      })
    ).toBe('REVOKE DELETE ON TABLE "public"."orders" FROM PUBLIC')
    expect(
      buildAdminSql({
        kind: 'maintenance',
        operation: 'VACUUM (ANALYZE)',
        schema: 'public',
        table: 'orders'
      })
    ).toBe('VACUUM (ANALYZE) "public"."orders"')
    expect(
      buildAdminSql({
        kind: 'create-policy',
        name: 'tenant access',
        schema: 'public',
        table: 'orders',
        command: 'SELECT',
        role: 'app',
        using: "tenant_id = current_setting('app.tenant')::uuid"
      })
    ).toBe(
      'CREATE POLICY "tenant access" ON "public"."orders" FOR SELECT TO "app" USING (tenant_id = current_setting(\'app.tenant\')::uuid)'
    )
    expect(buildTopQueriesSql('monitoring')).toContain('FROM "monitoring".pg_stat_statements')
    expect(
      buildAdminSql({
        kind: 'alter-role',
        role: 'app',
        attribute: 'CREATEDB',
        enabled: false
      })
    ).toBe('ALTER ROLE "app" NOCREATEDB')
  })

  it('validates backend identifiers and required names', () => {
    expect(GRANTS_SQL).toContain('::"char"')
    expect(buildAdminSql({ kind: 'backend', operation: 'terminate', pid: 42 })).toBe(
      'SELECT pg_terminate_backend(42)'
    )
    expect(() => buildAdminSql({ kind: 'backend', operation: 'cancel', pid: -1 })).toThrow(
      'Invalid backend PID'
    )
    expect(() => quoteIdentifier(' ')).toThrow('Identifier is required')
    expect(() =>
      buildAdminSql({
        kind: 'create-policy',
        name: 'bad',
        schema: 'public',
        table: 'orders',
        command: 'ALL',
        role: 'PUBLIC',
        using: 'true; DROP TABLE orders'
      })
    ).toThrow('statement separators')
  })

  it('builds only command-legal ALTER POLICY clauses', () => {
    expect(
      buildAdminSql({
        kind: 'alter-policy',
        name: 'tenant select',
        schema: 'public',
        table: 'orders',
        command: 'SELECT',
        role: 'PUBLIC',
        using: 'tenant_id = current_user'
      })
    ).toBe(
      'ALTER POLICY "tenant select" ON "public"."orders" TO PUBLIC USING (tenant_id = current_user)'
    )
    expect(
      buildAdminSql({
        kind: 'alter-policy',
        name: 'tenant insert',
        schema: 'public',
        table: 'orders',
        command: 'INSERT',
        role: 'app',
        check: 'tenant_id = current_user'
      })
    ).toContain('TO "app" WITH CHECK (tenant_id = current_user)')
    expect(
      buildAdminSql({
        kind: 'alter-policy',
        name: 'tenant update',
        schema: 'public',
        table: 'orders',
        command: 'UPDATE',
        role: 'app',
        using: 'visible',
        check: 'writable'
      })
    ).toContain('USING (visible) WITH CHECK (writable)')
    expect(
      buildAdminSql({
        kind: 'alter-policy',
        name: 'tenant all',
        schema: 'public',
        table: 'orders',
        command: 'ALL',
        role: 'app',
        using: 'visible',
        check: 'writable'
      })
    ).toContain('USING (visible) WITH CHECK (writable)')
    expect(() =>
      buildAdminSql({
        kind: 'alter-policy',
        name: 'bad insert',
        schema: 'public',
        table: 'orders',
        command: 'INSERT',
        role: 'app',
        using: 'true'
      })
    ).toThrow('INSERT policies cannot have a USING expression')
    expect(() =>
      buildAdminSql({
        kind: 'alter-policy',
        name: 'bad delete',
        schema: 'public',
        table: 'orders',
        command: 'DELETE',
        role: 'app',
        check: 'true'
      })
    ).toThrow('DELETE policies cannot have a WITH CHECK expression')
  })
})
