import type {
  ConnectionProfile,
  DBConnectionOptions,
  DatabaseType,
  SQLConnectionOptions,
  TableDataOptions
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
  Pick<TableDataOptions, 'limit' | 'offset' | 'sortColumn' | 'sortOrder'>

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

  let sortColumn: string | undefined
  if (typeof input.sortColumn === 'string') {
    const column = input.sortColumn.trim()
    if (column) {
      sortColumn = column
    }
  } else if (input.sortColumn !== undefined) {
    throw new ValidationError('Invalid value for "sortColumn": expected string')
  }

  let sortOrder: 'ASC' | 'DESC' | undefined
  if (typeof input.sortOrder === 'string') {
    const order = input.sortOrder.toUpperCase()
    if (order === 'ASC' || order === 'DESC') {
      sortOrder = order
    } else {
      throw new ValidationError('Invalid value for "sortOrder": expected "ASC" or "DESC"')
    }
  } else if (input.sortOrder !== undefined) {
    throw new ValidationError('Invalid value for "sortOrder": expected string')
  }

  return {
    connectionId,
    schema,
    table,
    limit,
    offset,
    sortColumn,
    sortOrder
  }
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
