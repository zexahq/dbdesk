import { describe, expect, it } from 'vitest'
import {
  buildStructureSql,
  isStructureExecutionConfirmed
} from '../../../packages/shared/src/adapters/structure'
import { QUERIES } from '../../../packages/shared/src/adapters/queries'

describe('table structure SQL', () => {
  it('quotes identifiers for column operations', () => {
    expect(
      buildStructureSql({
        schema: 'odd"schema',
        table: 'order',
        operation: {
          kind: 'add-column',
          name: 'total',
          dataType: 'numeric(10, 2)',
          nullable: false,
          defaultValue: '0'
        }
      })
    ).toBe(
      'ALTER TABLE "odd""schema"."order" ADD COLUMN "total" numeric(10, 2) NOT NULL DEFAULT 0;'
    )
  })

  it('generates foreign keys with reviewed actions', () => {
    expect(
      buildStructureSql({
        schema: 'public',
        table: 'orders',
        operation: {
          kind: 'add-constraint',
          name: 'orders_customer_fk',
          constraintType: 'foreign-key',
          columns: ['customer_id', 'tenant_id'],
          referencedSchema: 'crm',
          referencedTable: 'customers',
          referencedColumns: ['id', 'tenant_id'],
          onDelete: 'CASCADE',
          onUpdate: 'NO ACTION'
        }
      })
    ).toBe(
      'ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_customer_fk" FOREIGN KEY ("customer_id", "tenant_id") REFERENCES "crm"."customers" ("id", "tenant_id") ON DELETE CASCADE ON UPDATE NO ACTION;'
    )
  })

  it('generates check constraints and indexes', () => {
    expect(
      buildStructureSql({
        schema: 'public',
        table: 'orders',
        operation: {
          kind: 'add-constraint',
          name: 'positive_total',
          constraintType: 'check',
          checkExpression: 'total >= 0'
        }
      })
    ).toContain('CHECK (total >= 0)')

    expect(
      buildStructureSql({
        schema: 'public',
        table: 'orders',
        operation: { kind: 'add-index', name: 'orders_total_idx', columns: ['total'], unique: true }
      })
    ).toBe('CREATE UNIQUE INDEX "orders_total_idx" ON "public"."orders" ("total");')
  })

  it('allows SQL tokens inside literals but rejects additional statements', () => {
    expect(
      buildStructureSql({
        schema: 'public',
        table: 'orders',
        operation: {
          kind: 'set-column-default',
          column: 'label',
          defaultValue: "'semi; -- not a comment /* still text */'"
        }
      })
    ).toContain("SET DEFAULT 'semi; -- not a comment /* still text */'")

    expect(() =>
      buildStructureSql({
        schema: 'public',
        table: 'orders',
        operation: {
          kind: 'set-column-default',
          column: 'total',
          defaultValue: '0; DROP TABLE orders'
        }
      })
    ).toThrow('cannot contain additional statements')
  })

  it('rejects mismatched composite foreign keys', () => {
    expect(() =>
      buildStructureSql({
        schema: 'public',
        table: 'orders',
        operation: {
          kind: 'add-constraint',
          name: 'bad_fk',
          constraintType: 'foreign-key',
          columns: ['tenant_id', 'customer_id'],
          referencedSchema: 'public',
          referencedTable: 'customers',
          referencedColumns: ['id']
        }
      })
    ).toThrow('Foreign key column counts must match')
  })

  it.each([
    [
      { kind: 'rename-column', column: 'old', newName: 'new' } as const,
      'ALTER TABLE "public"."orders" RENAME COLUMN "old" TO "new";'
    ],
    [
      { kind: 'change-column-type', column: 'total', dataType: 'bigint' } as const,
      'ALTER TABLE "public"."orders" ALTER COLUMN "total" TYPE bigint;'
    ],
    [
      { kind: 'set-column-nullability', column: 'total', nullable: true } as const,
      'ALTER TABLE "public"."orders" ALTER COLUMN "total" DROP NOT NULL;'
    ],
    [
      { kind: 'set-column-default', column: 'total' } as const,
      'ALTER TABLE "public"."orders" ALTER COLUMN "total" DROP DEFAULT;'
    ],
    [
      { kind: 'drop-column', column: 'total' } as const,
      'ALTER TABLE "public"."orders" DROP COLUMN "total";'
    ],
    [
      { kind: 'drop-constraint', name: 'orders_pkey' } as const,
      'ALTER TABLE "public"."orders" DROP CONSTRAINT "orders_pkey";'
    ],
    [
      { kind: 'drop-index', name: 'orders_total_idx' } as const,
      'DROP INDEX "public"."orders_total_idx";'
    ]
  ])('generates %s', (operation, expected) => {
    expect(buildStructureSql({ schema: 'public', table: 'orders', operation })).toBe(expected)
  })

  it('adds an optional reviewed USING expression for type changes', () => {
    expect(
      buildStructureSql({
        schema: 'public',
        table: 'orders',
        operation: {
          kind: 'change-column-type',
          column: 'total',
          dataType: 'numeric(10, 2)',
          usingExpression: 'total::numeric(10, 2)'
        }
      })
    ).toBe(
      'ALTER TABLE "public"."orders" ALTER COLUMN "total" TYPE numeric(10, 2) USING total::numeric(10, 2);'
    )
  })

  it('requires an exact connection name only for production changes', () => {
    expect(isStructureExecutionConfirmed(false, 'Primary', '')).toBe(true)
    expect(isStructureExecutionConfirmed(true, '', '')).toBe(false)
    expect(isStructureExecutionConfirmed(true, 'Primary', 'primary')).toBe(false)
    expect(isStructureExecutionConfirmed(true, 'Primary', 'Primary ')).toBe(false)
    expect(isStructureExecutionConfirmed(true, 'Primary', 'Primary')).toBe(true)
  })

  it('introspects exact PostgreSQL type declarations', () => {
    expect(QUERIES.LIST_COLUMNS).toContain(
      'pg_catalog.format_type(a.atttypid, a.atttypmod) AS formatted_data_type'
    )
  })
})
