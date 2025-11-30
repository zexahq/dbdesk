import type { TableFilterCondition } from '@common/types'

export const TABLE_FILTER_OPERATORS: Array<{
  value: TableFilterCondition['operator']
  label: string
  shortLabel: string
}> = [
  { value: '=', label: '  Equals', shortLabel: '=' },
  { value: '<>', label: 'Not equal', shortLabel: '<>' },
  { value: '>', label: 'Greater than', shortLabel: '>' },
  { value: '<', label: 'Less than', shortLabel: '<' },
  { value: '>=', label: 'Greater than or equal', shortLabel: '>=' },
  { value: '<=', label: 'Less than or equal', shortLabel: '<=' },
  { value: 'LIKE', label: '[~~] like operator', shortLabel: 'LIKE' },
  { value: 'ILIKE', label: 'Ilike operator', shortLabel: 'ILIKE' },
  { value: 'IN', label: 'One of a list of values', shortLabel: 'IN' },
  { value: 'IS', label: '[is] checking for (null, not null, true, false)', shortLabel: 'IS' }
]

export const TABLE_FILTER_IS_VALUES: Array<{
  value: 'NULL' | 'NOT NULL' | 'TRUE' | 'FALSE'
  label: string
}> = [
  { value: 'NULL', label: 'NULL' },
  { value: 'NOT NULL', label: 'NOT NULL' },
  { value: 'TRUE', label: 'TRUE' },
  { value: 'FALSE', label: 'FALSE' }
]
