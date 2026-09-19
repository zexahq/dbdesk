import type { DatabaseToolRequest, SQLConnectionOptions } from '@dbdesk/shared/types'
import { randomUUID } from 'node:crypto'
import { rename, stat, unlink } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { ValidationError } from '../utils/errors'

export interface DatabaseToolCommand {
  executable: 'pg_dump' | 'pg_restore' | 'psql'
  args: string[]
}

const reservedShortOptions = ['-d', '-f', '-F', '-h', '-n', '-p', '-t', '-U', '-W']

const reservedLongOptions = [
  '--dbname',
  '--file',
  '--format',
  '--host',
  '--password',
  '--port',
  '--schema',
  '--table',
  '--username'
]

const incompatibleTransactionalRestoreOptions = [
  ['-C', '--create'],
  [undefined, '--transaction-size']
] as const

const matchesOption = (argument: string, shortOption: string | undefined, longOption: string) => {
  if (shortOption && argument.startsWith(shortOption)) return true
  const suppliedOption = argument.split('=', 1)[0]
  return suppliedOption.startsWith('--') && longOption.startsWith(suppliedOption)
}

const findIncompatibleTransactionalRestoreOption = (args: string[]) => {
  const incompatibleOption = args.find((argument) =>
    incompatibleTransactionalRestoreOptions.some(([shortOption, longOption]) =>
      matchesOption(argument, shortOption, longOption)
    )
  )
  if (incompatibleOption) return incompatibleOption

  for (const [index, argument] of args.entries()) {
    if (!matchesOption(argument, '-j', '--jobs')) continue

    const attachedValue = argument.startsWith('-j') ? argument.slice(2) : argument.split('=', 2)[1]
    const workerCount = Number(attachedValue || args[index + 1])
    if (workerCount > 1) return argument
  }

  return undefined
}

export function tokenizeDatabaseToolArgs(input = ''): string[] {
  const args: string[] = []
  let current = ''
  let quote: 'single' | 'double' | null = null
  let escaped = false
  let started = false

  for (const character of input) {
    if (escaped) {
      current += character
      escaped = false
      started = true
      continue
    }

    if (character === '\\' && quote !== 'single') {
      escaped = true
      started = true
      continue
    }

    if (character === "'" && quote !== 'double') {
      quote = quote === 'single' ? null : 'single'
      started = true
      continue
    }

    if (character === '"' && quote !== 'single') {
      quote = quote === 'double' ? null : 'double'
      started = true
      continue
    }

    if (/\s/.test(character) && !quote) {
      if (started) args.push(current)
      current = ''
      started = false
      continue
    }

    current += character
    started = true
  }

  if (escaped || quote) throw new ValidationError('Custom arguments contain an unfinished quote')
  if (started) args.push(current)

  const reserved = args.find(
    (argument) =>
      argument === '--' ||
      reservedShortOptions.some((option) => argument.startsWith(option)) ||
      reservedLongOptions.some((option) => {
        const suppliedOption = argument.split('=', 1)[0]
        return suppliedOption.startsWith('--') && option.startsWith(suppliedOption)
      })
  )
  if (reserved) throw new ValidationError(`Custom argument "${reserved}" is managed by DBDesk`)

  return args
}

export function buildDatabaseToolCommand(
  request: DatabaseToolRequest,
  connection: SQLConnectionOptions
): DatabaseToolCommand {
  const connectionArgs = [
    '--host',
    connection.host,
    '--port',
    String(connection.port),
    '--username',
    connection.user,
    '--dbname',
    connection.database,
    '--no-password'
  ]
  const customArgs = tokenizeDatabaseToolArgs(request.customArgs)
  const selectionArgs = [
    ...(request.schemas ?? []).flatMap((schema) => ['--schema', schema]),
    ...(request.tables ?? []).flatMap((table) => ['--table', table])
  ]
  const verboseArgs = request.verbose ? ['--verbose'] : []

  if (request.mode === 'backup') {
    return {
      executable: 'pg_dump',
      args: [
        ...connectionArgs,
        `--format=${request.format}`,
        ...selectionArgs,
        ...verboseArgs,
        ...(request.clean && request.format === 'plain' ? ['--clean', '--if-exists'] : []),
        ...customArgs,
        '--file',
        request.filePath
      ]
    }
  }

  if (request.format === 'plain') {
    return {
      executable: 'psql',
      args: [
        ...connectionArgs,
        '--set',
        'ON_ERROR_STOP=on',
        '--single-transaction',
        ...(request.verbose ? ['--echo-errors'] : []),
        ...customArgs,
        '--file',
        request.filePath
      ]
    }
  }

  const incompatibleOption = findIncompatibleTransactionalRestoreOption(customArgs)
  if (incompatibleOption) {
    throw new ValidationError(
      `Custom argument "${incompatibleOption}" cannot be used with transactional restores`
    )
  }

  return {
    executable: 'pg_restore',
    args: [
      ...connectionArgs,
      '--exit-on-error',
      '--single-transaction',
      ...selectionArgs,
      ...verboseArgs,
      ...(request.clean ? ['--clean', '--if-exists'] : []),
      ...customArgs,
      request.filePath
    ]
  }
}

const quoteForPreview = (argument: string) =>
  /^[A-Za-z0-9_./:@%+=,-]+$/.test(argument) ? argument : `'${argument.replaceAll("'", "'\\''")}'`

export function formatDatabaseToolCommand(command: DatabaseToolCommand): string {
  return [command.executable, ...command.args].map(quoteForPreview).join(' ')
}

export function ensureDatabaseToolAllowed(
  request: DatabaseToolRequest,
  connection: SQLConnectionOptions
): void {
  if (request.mode === 'restore' && 'readOnly' in connection && connection.readOnly === true) {
    throw new ValidationError('Restore is disabled for read-only connection profiles')
  }
}

export const createBackupTempPath = (destination: string, id = randomUUID()) =>
  join(dirname(destination), `.${basename(destination)}.${id}.tmp`)

export async function commitBackupFile(tempPath: string, destination: string) {
  await rename(tempPath, destination)
  try {
    return (await stat(destination)).size
  } catch {
    return undefined
  }
}

export async function discardBackupFile(tempPath: string) {
  try {
    await unlink(tempPath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
}
