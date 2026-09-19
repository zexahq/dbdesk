import type {
  ConstraintInfo,
  TableDataColumn,
  TableFilterCondition,
  TableFilterScalar
} from '@dbdesk/shared/types'

export type ForeignKeyNavigation = {
  sourceColumn: string
  referencedSchema: string
  referencedTable: string
  referencedColumn: string
  filter: TableFilterCondition
}

export function isForeignKeyActivationKey(key: string): boolean {
  return key === 'Enter' || key === ' ' || key === 'Spacebar'
}

function toFilterValue(value: unknown): TableFilterScalar | undefined {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'bigint' ||
    typeof value === 'boolean'
  ) {
    return value
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString()
  }

  return undefined
}

export function getForeignKeyNavigation(
  column: TableDataColumn,
  constraints: ConstraintInfo[] | undefined,
  value: unknown
): ForeignKeyNavigation | undefined {
  const foreignKey = column.foreignKey
  const filterValue = toFilterValue(value)
  if (!foreignKey || filterValue === undefined) return undefined

  const isSingleColumnRelation = constraints?.some(
    (constraint) =>
      constraint.type === 'FOREIGN KEY' &&
      constraint.columns.length === 1 &&
      constraint.columns[0] === column.name &&
      constraint.foreignTable?.schema === foreignKey.referencedSchema &&
      constraint.foreignTable.name === foreignKey.referencedTable &&
      constraint.foreignColumns?.length === 1 &&
      constraint.foreignColumns[0] === foreignKey.referencedColumn
  )

  if (!isSingleColumnRelation) return undefined

  return {
    sourceColumn: column.name,
    referencedSchema: foreignKey.referencedSchema,
    referencedTable: foreignKey.referencedTable,
    referencedColumn: foreignKey.referencedColumn,
    filter: {
      column: foreignKey.referencedColumn,
      operator: '=',
      value: filterValue
    }
  }
}
