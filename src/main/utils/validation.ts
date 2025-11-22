import type {
  ConnectionProfile,
  DBConnectionOptions,
  DatabaseType,
  SQLConnectionOptions,
  TableDataOptions,
  TableFilterCondition,
  TableSortRule
} from '@common/types'
import { ValidationError } from './errors'

type CreateConnectionInput = {
  name: string
  type: DatabaseType
  options: DBConnectionOptions
}

type UpdateConnectionInput = {
  connectionId: string
  name: string
  type: DatabaseType
  options: DBConnectionOptions
}

export type RunQueryInput = {
  connectionId: string
  query: string
}

export type SchemaInput = {
  connectionId: string
  schema: string
}

export type SchemaIntrospectInput = SchemaInput & {
  table: string
}

export type ConnectionIdentifierInput = {
  connectionId: string
}

export type TableDataInput = SchemaIntrospectInput &
  Pick<TableDataOptions, 'limit' | 'offset' | 'sortRules' | 'filters'>

export type TableDeleteRowsInput = SchemaIntrospectInput & {
  rows: Array<Record<string, unknown>>
}

export const validateCreateConnectionInput = (input: unknown): CreateConnectionInput => {
  if (!isObject(input)) {
    throw new ValidationError('Invalid payload: expected object for connection details')
  }

  const name = toNonEmptyString(input.name, 'name')
  const type = toDatabaseType(input.type)
  const options = validateConnectionOptions(type, input.options)

  return { name, type, options }
}

export const validateUpdateConnectionInput = (input: unknown): UpdateConnectionInput => {
  if (!isObject(input)) {
    throw new ValidationError('Invalid payload: expected object for connection update details')
  }

  const connectionId = toNonEmptyString(input.connectionId, 'connectionId')
  const name = toNonEmptyString(input.name, 'name')
  const type = toDatabaseType(input.type)
  const options = validateConnectionOptions(type, input.options)

  return { connectionId, name, type, options }
}

export const validateConnectionProfile = (profile: ConnectionProfile): ConnectionProfile => {
  if (!profile.id) {
    throw new ValidationError('Connection profile is missing an id')
  }

  if (!profile.name) {
    throw new ValidationError('Connection profile is missing a name')
  }

  return profile
}

export const validateConnectionOptions = (
  type: DatabaseType,
  options: unknown
): DBConnectionOptions => {
  switch (type) {
    case 'postgres':
    case 'mysql':
      return validateSQLConnectionOptions(options)
    default:
      throw new ValidationError(`Unsupported database type "${type}"`)
  }
}

const validateSQLConnectionOptions = (options: unknown): SQLConnectionOptions => {
  if (!isObject(options)) {
    throw new ValidationError('Invalid SQL connection options: expected object')
  }

  const host = toNonEmptyString(options.host, 'host')
  const database = toNonEmptyString(options.database, 'database')
  const user = toNonEmptyString(options.user, 'user')
  const password = toNonEmptyString(options.password, 'password')
  const port = toPort(options.port)

  return {
    host,
    database,
    user,
    password,
    port,
    ssl: options.ssl
  }
}

export const validateQueryInput = (input: unknown): RunQueryInput => {
  if (!isObject(input)) {
    throw new ValidationError('Invalid query payload: expected object')
  }

  const connectionId = toNonEmptyString(input.connectionId, 'connectionId')
  const query = toNonEmptyString(input.query, 'query')

  return { connectionId, query }
}

export const validateSchemaInput = (
  input: unknown,
  options: { requireSchema?: boolean; requireTable?: boolean } = {}
): SchemaIntrospectInput | SchemaInput | ConnectionIdentifierInput => {
  if (!isObject(input)) {
    throw new ValidationError('Invalid schema payload: expected object')
  }

  const connectionId = toNonEmptyString(input.connectionId, 'connectionId')

  if (options.requireTable) {
    const schema = toNonEmptyString(input.schema, 'schema')
    const table = toNonEmptyString(input.table, 'table')
    return { connectionId, schema, table }
  }

  if (options.requireSchema) {
    const schema = toNonEmptyString(input.schema, 'schema')
    return { connectionId, schema }
  }

  return { connectionId }
}

export const validateConnectionIdentifier = (input: unknown): ConnectionIdentifierInput => {
  if (!isObject(input)) {
    throw new ValidationError('Invalid payload: expected object with connectionId')
  }

  const connectionId = toNonEmptyString(input.connectionId, 'connectionId')
  return { connectionId }
}

export const validateTableDataInput = (input: unknown): TableDataInput => {
  if (!isObject(input)) {
    throw new ValidationError('Invalid table data payload: expected object')
  }

  const { connectionId, schema, table } = validateSchemaInput(input, {
    requireSchema: true,
    requireTable: true
  }) as SchemaIntrospectInput

  const limit = toOptionalInteger(input.limit, 'limit', { min: 1, defaultValue: 50 })
  const offset = toOptionalInteger(input.offset, 'offset', { min: 0, defaultValue: 0 })

  let sortRules: TableSortRule[] | undefined
  if (input.sortRules !== undefined) {
    if (!Array.isArray(input.sortRules)) {
      throw new ValidationError('Invalid value for "sortRules": expected array')
    }
    sortRules = input.sortRules.map((rule, index) => validateSortRule(rule, index))
  }

  let filters: TableFilterCondition[] | undefined
  if (input.filters !== undefined) {
    if (!Array.isArray(input.filters)) {
      throw new ValidationError('Invalid value for "filters": expected array')
    }
    filters = input.filters.map((filter, index) => validateFilterCondition(filter, index))
  }

  return {
    connectionId,
    schema,
    table,
    limit,
    offset,
    sortRules,
    filters
  }
}

export const validateDeleteRowsInput = (input: unknown): TableDeleteRowsInput => {
  if (!isObject(input)) {
    throw new ValidationError('Invalid delete rows payload: expected object')
  }

  const { connectionId, schema, table } = validateSchemaInput(input, {
    requireSchema: true,
    requireTable: true
  }) as SchemaIntrospectInput

  if (!Array.isArray(input.rows) || input.rows.length === 0) {
    throw new ValidationError('Invalid value for "rows": expected non-empty array')
  }

  const rows = input.rows.map((row, index) => {
    if (!isObject(row)) {
      throw new ValidationError(`Invalid row at index ${index}: expected object`)
    }
    return row
  })

  return {
    connectionId,
    schema,
    table,
    rows
  }
}

const validateFilterCondition = (filter: unknown, index: number): TableFilterCondition => {
  if (!isObject(filter)) {
    throw new ValidationError(`Invalid filter at index ${index}: expected object`)
  }

  const column = toNonEmptyString(filter.column, `filters[${index}].column`)
  const operator = toFilterOperator(filter.operator, `filters[${index}].operator`)

  if (operator === 'IN') {
    if (!Array.isArray(filter.value)) {
      throw new ValidationError(
        `Invalid filter at index ${index}: "IN" operator requires array value`
      )
    }
    if (filter.value.length === 0) {
      throw new ValidationError(
        `Invalid filter at index ${index}: "IN" operator requires non-empty array`
      )
    }
    const values = filter.value.map((v, i) =>
      validateFilterScalarValue(v, `filters[${index}].value[${i}]`)
    )
    return { column, operator: 'IN', value: values }
  }

  if (operator === 'IS') {
    const isValue = toFilterIsValue(filter.value, `filters[${index}].value`)
    return { column, operator: 'IS', value: isValue }
  }

  const value = validateFilterScalarValue(filter.value, `filters[${index}].value`)
  return { column, operator, value }
}

const validateSortRule = (rule: unknown, index: number): TableSortRule => {
  if (!isObject(rule)) {
    throw new ValidationError(`Invalid sort rule at index ${index}: expected object`)
  }

  const column = toNonEmptyString(rule.column, `sortRules[${index}].column`)
  const directionValue = typeof rule.direction === 'string' ? rule.direction.toUpperCase() : null

  if (directionValue !== 'ASC' && directionValue !== 'DESC') {
    throw new ValidationError(
      `Invalid sort rule at index ${index}: direction must be "ASC" or "DESC"`
    )
  }

  return {
    column,
    direction: directionValue
  }
}

const toFilterOperator = (value: unknown, field: string): TableFilterCondition['operator'] => {
  if (typeof value !== 'string') {
    throw new ValidationError(`Invalid value for "${field}": expected string`)
  }

  const validOperators = ['=', '<>', '>', '<', '>=', '<=', 'LIKE', 'ILIKE', 'IN', 'IS']
  if (!validOperators.includes(value)) {
    throw new ValidationError(
      `Invalid value for "${field}": expected one of ${validOperators.join(', ')}`
    )
  }

  return value as TableFilterCondition['operator']
}

const toFilterIsValue = (value: unknown, field: string): 'NULL' | 'NOT NULL' | 'TRUE' | 'FALSE' => {
  if (typeof value !== 'string') {
    throw new ValidationError(`Invalid value for "${field}": expected string`)
  }

  const validValues = ['NULL', 'NOT NULL', 'TRUE', 'FALSE']
  if (!validValues.includes(value)) {
    throw new ValidationError(
      `Invalid value for "${field}": expected one of ${validValues.join(', ')}`
    )
  }

  return value as 'NULL' | 'NOT NULL' | 'TRUE' | 'FALSE'
}

const validateFilterScalarValue = (
  value: unknown,
  field: string
): string | number | bigint | boolean | Date => {
  if (value === null || value === undefined) {
    throw new ValidationError(`Invalid value for "${field}": cannot be null or undefined`)
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'bigint') {
    return value
  }

  if (value instanceof Date) {
    return value
  }

  throw new ValidationError(
    `Invalid value for "${field}": expected string, number, boolean, bigint, or Date`
  )
}

const isObject = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null

const toNonEmptyString = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ValidationError(`Invalid value for "${field}": expected non-empty string`)
  }

  return value.trim()
}

const toDatabaseType = (value: unknown): DatabaseType => {
  if (value === 'postgres' || value === 'mysql' || value === 'mongodb' || value === 'redis') {
    return value
  }

  throw new ValidationError(`Invalid database type "${String(value)}"`)
}

const toPort = (value: unknown): number => {
  const portValue =
    typeof value === 'string' ? Number.parseInt(value, 10) : typeof value === 'number' ? value : NaN

  if (!Number.isInteger(portValue) || portValue <= 0 || portValue > 65535) {
    throw new ValidationError('Invalid port: expected integer between 1 and 65535')
  }

  return portValue
}

const toOptionalInteger = (
  value: unknown,
  field: string,
  { min, max, defaultValue }: { min: number; max?: number; defaultValue: number }
): number => {
  if (value === undefined || value === null) {
    return defaultValue
  }

  const intValue =
    typeof value === 'string'
      ? Number.parseInt(value, 10)
      : typeof value === 'number'
        ? Math.trunc(value)
        : NaN

  if (!Number.isInteger(intValue)) {
    throw new ValidationError(`Invalid value for "${field}": expected integer`)
  }

  if (intValue < min) {
    throw new ValidationError(`Invalid value for "${field}": expected integer >= ${min}`)
  }

  if (typeof max === 'number' && intValue > max) {
    throw new ValidationError(`Invalid value for "${field}": expected integer <= ${max}`)
  }

  return intValue
}
