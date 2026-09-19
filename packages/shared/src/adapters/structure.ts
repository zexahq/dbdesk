import { quoteIdentifier } from './utils'
import { hasAdditionalStatements, normalizeQuery } from './sql-parser'

export type ReferentialAction = 'NO ACTION' | 'RESTRICT' | 'CASCADE' | 'SET NULL' | 'SET DEFAULT'

export type StructureOperation =
  | {
      kind: 'add-column'
      name: string
      dataType: string
      nullable: boolean
      defaultValue?: string
    }
  | { kind: 'rename-column'; column: string; newName: string }
  | { kind: 'change-column-type'; column: string; dataType: string; usingExpression?: string }
  | { kind: 'set-column-nullability'; column: string; nullable: boolean }
  | { kind: 'set-column-default'; column: string; defaultValue?: string }
  | { kind: 'drop-column'; column: string }
  | {
      kind: 'add-constraint'
      name: string
      constraintType: 'primary-key' | 'unique' | 'foreign-key' | 'check'
      columns?: string[]
      referencedSchema?: string
      referencedTable?: string
      referencedColumns?: string[]
      checkExpression?: string
      onDelete?: ReferentialAction
      onUpdate?: ReferentialAction
    }
  | { kind: 'drop-constraint'; name: string }
  | { kind: 'add-index'; name: string; columns: string[]; unique: boolean }
  | { kind: 'drop-index'; name: string }

const identifier = (value: string, label: string) => {
  const trimmed = value.trim()
  if (!trimmed || trimmed.includes('\0')) throw new Error(`${label} is required`)
  return quoteIdentifier(trimmed)
}

const fragment = (value: string | undefined, label: string) => {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) throw new Error(`${label} is required`)
  if (trimmed.includes('\0') || hasAdditionalStatements(trimmed)) {
    throw new Error(`${label} cannot contain additional statements`)
  }
  return normalizeQuery(trimmed)
}

const identifierList = (values: string[] | undefined, label: string) => {
  if (!values?.length) throw new Error(`${label} is required`)
  return values.map((value) => identifier(value, label)).join(', ')
}

export function buildStructureSql(options: {
  schema: string
  table: string
  operation: StructureOperation
}): string {
  const { operation } = options
  const table = `${identifier(options.schema, 'Schema')}.${identifier(options.table, 'Table')}`

  switch (operation.kind) {
    case 'add-column': {
      const defaultClause = operation.defaultValue?.trim()
        ? ` DEFAULT ${fragment(operation.defaultValue, 'Default value')}`
        : ''
      return `ALTER TABLE ${table} ADD COLUMN ${identifier(operation.name, 'Column name')} ${fragment(operation.dataType, 'Data type')}${operation.nullable ? '' : ' NOT NULL'}${defaultClause};`
    }
    case 'rename-column':
      return `ALTER TABLE ${table} RENAME COLUMN ${identifier(operation.column, 'Column')} TO ${identifier(operation.newName, 'New column name')};`
    case 'change-column-type':
      return `ALTER TABLE ${table} ALTER COLUMN ${identifier(operation.column, 'Column')} TYPE ${fragment(operation.dataType, 'Data type')}${operation.usingExpression?.trim() ? ` USING ${fragment(operation.usingExpression, 'USING expression')}` : ''};`
    case 'set-column-nullability':
      return `ALTER TABLE ${table} ALTER COLUMN ${identifier(operation.column, 'Column')} ${operation.nullable ? 'DROP' : 'SET'} NOT NULL;`
    case 'set-column-default':
      return operation.defaultValue?.trim()
        ? `ALTER TABLE ${table} ALTER COLUMN ${identifier(operation.column, 'Column')} SET DEFAULT ${fragment(operation.defaultValue, 'Default value')};`
        : `ALTER TABLE ${table} ALTER COLUMN ${identifier(operation.column, 'Column')} DROP DEFAULT;`
    case 'drop-column':
      return `ALTER TABLE ${table} DROP COLUMN ${identifier(operation.column, 'Column')};`
    case 'drop-constraint':
      return `ALTER TABLE ${table} DROP CONSTRAINT ${identifier(operation.name, 'Constraint name')};`
    case 'drop-index':
      return `DROP INDEX ${identifier(options.schema, 'Schema')}.${identifier(operation.name, 'Index name')};`
    case 'add-index':
      return `CREATE ${operation.unique ? 'UNIQUE ' : ''}INDEX ${identifier(operation.name, 'Index name')} ON ${table} (${identifierList(operation.columns, 'Index columns')});`
    case 'add-constraint': {
      const name = identifier(operation.name, 'Constraint name')
      if (operation.constraintType === 'check') {
        return `ALTER TABLE ${table} ADD CONSTRAINT ${name} CHECK (${fragment(operation.checkExpression, 'Check expression')});`
      }

      const columns = identifierList(operation.columns, 'Constraint columns')
      if (operation.constraintType === 'primary-key') {
        return `ALTER TABLE ${table} ADD CONSTRAINT ${name} PRIMARY KEY (${columns});`
      }
      if (operation.constraintType === 'unique') {
        return `ALTER TABLE ${table} ADD CONSTRAINT ${name} UNIQUE (${columns});`
      }

      const referencedTable = `${identifier(operation.referencedSchema ?? '', 'Referenced schema')}.${identifier(operation.referencedTable ?? '', 'Referenced table')}`
      const referencedColumns = identifierList(operation.referencedColumns, 'Referenced columns')
      if (operation.columns?.length !== operation.referencedColumns?.length) {
        throw new Error('Foreign key column counts must match')
      }
      return `ALTER TABLE ${table} ADD CONSTRAINT ${name} FOREIGN KEY (${columns}) REFERENCES ${referencedTable} (${referencedColumns}) ON DELETE ${operation.onDelete ?? 'NO ACTION'} ON UPDATE ${operation.onUpdate ?? 'NO ACTION'};`
    }
  }
}

export const isStructureExecutionConfirmed = (
  production: boolean,
  connectionName: string,
  confirmation: string
) => !production || (connectionName.length > 0 && confirmation === connectionName)
