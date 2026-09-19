import type { DatabaseToolRequest, SQLConnectionOptions } from '@dbdesk/shared/types'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildDatabaseToolCommand,
  commitBackupFile,
  createBackupTempPath,
  discardBackupFile,
  ensureDatabaseToolAllowed,
  formatDatabaseToolCommand,
  tokenizeDatabaseToolArgs
} from '../src/main/lib/database-tools'

const connection: SQLConnectionOptions = {
  host: 'localhost',
  port: 5432,
  database: 'app',
  user: 'postgres',
  password: 'never-print-this'
}

const request: DatabaseToolRequest = {
  connectionId: 'profile-id',
  mode: 'backup',
  format: 'custom',
  filePath: '/tmp/app backup.dump',
  schemas: ['public'],
  tables: ['users'],
  verbose: true,
  customArgs: '--no-owner --jobs "4"'
}

describe('database tool commands', () => {
  it('tokenizes quoted custom arguments without using a shell', () => {
    expect(tokenizeDatabaseToolArgs(`--exclude-table 'audit logs' --no-acl`)).toEqual([
      '--exclude-table',
      'audit logs',
      '--no-acl'
    ])
    expect(() => tokenizeDatabaseToolArgs('--file=/tmp/elsewhere')).toThrow('managed by DBDesk')
    expect(() => tokenizeDatabaseToolArgs('--hos=attacker.example')).toThrow('managed by DBDesk')
    expect(() => tokenizeDatabaseToolArgs('--dbn=postgresql://attacker.example/stolen')).toThrow(
      'managed by DBDesk'
    )
    expect(() => tokenizeDatabaseToolArgs('-dother')).toThrow('managed by DBDesk')
    expect(() => tokenizeDatabaseToolArgs('-- --file /tmp/elsewhere')).toThrow('managed by DBDesk')
    expect(() => tokenizeDatabaseToolArgs(`--no-owner 'unfinished`)).toThrow('unfinished quote')
  })

  it('builds a password-free pg_dump preview', () => {
    const command = buildDatabaseToolCommand(request, connection)
    const preview = formatDatabaseToolCommand(command)

    expect(command.executable).toBe('pg_dump')
    expect(command.args).toContain('/tmp/app backup.dump')
    expect(preview).toContain("'/tmp/app backup.dump'")
    expect(preview).not.toContain(connection.password)
  })

  it('uses psql only for plain SQL restores', () => {
    const command = buildDatabaseToolCommand(
      { ...request, mode: 'restore', format: 'plain', schemas: undefined, tables: undefined },
      connection
    )

    expect(command.executable).toBe('psql')
    expect(command.args.slice(-2)).toEqual(['--file', request.filePath])
    expect(command.args).toContain('ON_ERROR_STOP=on')
    expect(command.args).toContain('--single-transaction')
  })

  it('makes archive restores transactional and blocks read-only profiles', () => {
    const restore = { ...request, mode: 'restore' as const, customArgs: undefined }
    const readOnlyConnection = { ...connection, readOnly: true }
    expect(buildDatabaseToolCommand(restore, connection).args).toContain('--single-transaction')
    expect(() => ensureDatabaseToolAllowed(restore, readOnlyConnection)).toThrow('read-only')
    expect(() => ensureDatabaseToolAllowed(request, readOnlyConnection)).not.toThrow()
  })

  it('rejects archive restore options that conflict with a single transaction', () => {
    for (const customArgs of [
      '--jobs=4',
      '--jobs 4',
      '-j4',
      '-j 4',
      '--create',
      '-C',
      '--trans=100'
    ]) {
      expect(() =>
        buildDatabaseToolCommand({ ...request, mode: 'restore', customArgs }, connection)
      ).toThrow('cannot be used with transactional restores')
    }
  })

  it('allows one worker for an archive restore', () => {
    for (const customArgs of ['--jobs=1', '--jobs 1', '-j1', '-j 1']) {
      expect(
        buildDatabaseToolCommand({ ...request, mode: 'restore', customArgs }, connection).args
      ).toContain('--single-transaction')
    }
  })

  it('replaces an old backup only when the temp file is committed', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dbdesk-backup-test-'))
    const destination = join(directory, 'app.dump')
    const tempPath = createBackupTempPath(destination, 'job-id')
    try {
      await writeFile(destination, 'old backup')

      await expect(commitBackupFile(tempPath, destination)).rejects.toThrow()
      expect(await readFile(destination, 'utf8')).toBe('old backup')

      await writeFile(tempPath, 'new backup')
      await expect(commitBackupFile(tempPath, destination)).resolves.toBe(10)
      expect(await readFile(destination, 'utf8')).toBe('new backup')
      await discardBackupFile(tempPath)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
