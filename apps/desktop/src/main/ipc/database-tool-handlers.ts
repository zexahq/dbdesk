import type {
  DatabaseBackupFormat,
  DatabaseToolProgress,
  DatabaseToolRequest,
  SQLConnectionProfile
} from '@dbdesk/shared/types'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { delimiter, dirname, isAbsolute } from 'node:path'
import {
  BrowserWindow,
  dialog,
  type OpenDialogOptions,
  type SaveDialogOptions,
  type WebContents
} from 'electron'
import { getProfile } from '../storage'
import { ValidationError } from '../utils/errors'
import {
  buildDatabaseToolCommand,
  commitBackupFile,
  createBackupTempPath,
  discardBackupFile,
  ensureDatabaseToolAllowed,
  formatDatabaseToolCommand
} from '../lib/database-tools'
import { typedHandle } from './typed-handle'

type RunningJob = {
  child: ChildProcessWithoutNullStreams
  ownerId: number
  cancelled: boolean
}

const jobs = new Map<string, RunningJob>()

const postgresToolPath =
  process.platform === 'win32'
    ? process.env.PATH
    : [
        process.env.PATH,
        '/opt/homebrew/bin',
        '/usr/local/bin',
        '/Applications/Postgres.app/Contents/Versions/latest/bin'
      ]
        .filter(Boolean)
        .join(delimiter)

const extensions: Record<DatabaseBackupFormat, string[]> = {
  custom: ['dump', 'backup'],
  plain: ['sql'],
  tar: ['tar']
}

const getPostgresProfile = async (connectionId: string): Promise<SQLConnectionProfile> => {
  const profile = await getProfile(connectionId)
  if (!profile) throw new ValidationError(`Connection profile "${connectionId}" not found`)
  if (profile.type !== 'postgres') {
    throw new ValidationError('Backup and restore are available for PostgreSQL connections only')
  }
  return profile
}

const validateFilePath = (request: DatabaseToolRequest) => {
  if (!isAbsolute(request.filePath)) throw new ValidationError('Choose an absolute file path')

  if (request.mode === 'restore') {
    if (!existsSync(request.filePath) || !statSync(request.filePath).isFile()) {
      throw new ValidationError('The selected backup file does not exist')
    }
    return
  }

  if (
    !existsSync(dirname(request.filePath)) ||
    !statSync(dirname(request.filePath)).isDirectory()
  ) {
    throw new ValidationError('The selected backup folder does not exist')
  }
}

const sendProgress = (sender: WebContents, progress: DatabaseToolProgress) => {
  try {
    if (!sender.isDestroyed()) sender.send('database-tools:progress', progress)
  } catch (error) {
    console.warn('[database-tools] Failed to send progress:', error)
  }
}

export function registerDatabaseToolHandlers() {
  typedHandle('database-tools:choose-path', async ({ connectionId, mode, format }, event) => {
    const profile = await getPostgresProfile(connectionId)
    const owner = BrowserWindow.fromWebContents(event.sender)
    const filters = [{ name: `${format} backup`, extensions: extensions[format] }]

    if (mode === 'restore') {
      const options: OpenDialogOptions = {
        title: 'Choose PostgreSQL backup',
        properties: ['openFile'],
        filters
      }
      const result = owner
        ? await dialog.showOpenDialog(owner, options)
        : await dialog.showOpenDialog(options)
      return { filePath: result.canceled ? null : (result.filePaths[0] ?? null) }
    }

    const safeName = profile.name.replaceAll(/[^A-Za-z0-9_-]/g, '-').replaceAll(/-+/g, '-')
    const date = new Date().toISOString().slice(0, 10)
    const options: SaveDialogOptions = {
      title: 'Save PostgreSQL backup',
      defaultPath: `${safeName || 'database'}-${date}.${extensions[format][0]}`,
      properties: ['showOverwriteConfirmation'],
      filters
    }
    const result = owner
      ? await dialog.showSaveDialog(owner, options)
      : await dialog.showSaveDialog(options)
    return { filePath: result.canceled ? null : result.filePath || null }
  })

  typedHandle('database-tools:preview', async (request) => {
    validateFilePath(request)
    const profile = await getPostgresProfile(request.connectionId)
    ensureDatabaseToolAllowed(request, profile.options)
    return {
      command: formatDatabaseToolCommand(buildDatabaseToolCommand(request, profile.options))
    }
  })

  typedHandle('database-tools:start', async ({ jobId, ...request }, event) => {
    if (jobs.has(jobId))
      throw new ValidationError('A database tool job with this ID already exists')
    validateFilePath(request)

    const profile = await getPostgresProfile(request.connectionId)
    ensureDatabaseToolAllowed(request, profile.options)
    const tempPath = request.mode === 'backup' ? createBackupTempPath(request.filePath) : undefined
    const command = buildDatabaseToolCommand(
      tempPath ? { ...request, filePath: tempPath } : request,
      profile.options
    )
    const preview = formatDatabaseToolCommand(buildDatabaseToolCommand(request, profile.options))
    const child = spawn(command.executable, command.args, {
      shell: false,
      windowsHide: true,
      env: {
        ...process.env,
        PATH: postgresToolPath,
        ...(profile.options.password ? { PGPASSWORD: profile.options.password } : {}),
        PGSSLMODE: profile.options.sslMode ?? 'prefer'
      }
    })
    const job: RunningJob = { child, ownerId: event.sender.id, cancelled: false }
    jobs.set(jobId, job)
    const discardTemp = async () => {
      if (!tempPath) return
      try {
        await discardBackupFile(tempPath)
      } catch (error) {
        console.warn(`[database-tools] Failed to remove temporary backup ${tempPath}:`, error)
      }
    }
    const cancelOnWindowClose = () => {
      job.cancelled = child.kill()
    }
    event.sender.once('destroyed', cancelOnWindowClose)

    const emit = (
      status: DatabaseToolProgress['status'],
      stream: DatabaseToolProgress['stream'],
      message: string
    ) => {
      const sanitized = profile.options.password
        ? message.replaceAll(profile.options.password, '••••')
        : message
      if (sanitized.trim()) {
        sendProgress(event.sender, { jobId, status, stream, message: sanitized.trimEnd() })
      }
    }

    emit('running', 'system', `$ ${preview}`)
    child.stdout.on('data', (chunk: Buffer) => emit('running', 'stdout', chunk.toString()))
    child.stderr.on('data', (chunk: Buffer) => emit('running', 'stderr', chunk.toString()))
    child.on('error', (error) => {
      jobs.delete(jobId)
      event.sender.removeListener('destroyed', cancelOnWindowClose)
      void discardTemp().then(() => {
        emit(
          job.cancelled ? 'cancelled' : 'failed',
          'system',
          error.message.includes('ENOENT')
            ? `${command.executable} was not found. Install PostgreSQL client tools and ensure ` +
                'they are on PATH.'
            : error.message
        )
      })
    })
    child.on('close', (code) => {
      if (!jobs.delete(jobId)) return
      event.sender.removeListener('destroyed', cancelOnWindowClose)
      void (async () => {
        if (job.cancelled) {
          await discardTemp()
          emit('cancelled', 'system', 'Operation cancelled')
          return
        }

        if (code !== 0) {
          await discardTemp()
          emit('failed', 'system', `${command.executable} exited with code ${code ?? 'unknown'}`)
          return
        }

        let size: number | undefined
        if (tempPath) {
          try {
            size = await commitBackupFile(tempPath, request.filePath)
          } catch (error) {
            await discardTemp()
            emit(
              'failed',
              'system',
              'Backup could not be saved: ' +
                (error instanceof Error ? error.message : 'Unknown error')
            )
            return
          }
        }

        emit(
          'completed',
          'system',
          size === undefined
            ? `${request.mode === 'backup' ? 'Backup' : 'Restore'} completed`
            : `Backup completed (${Math.max(1, Math.round(size / 1024))} KB)`
        )
      })().catch((error) => {
        console.error('[database-tools] Failed to finalize operation:', error)
        void discardTemp()
        emit('failed', 'system', 'Operation finished but cleanup failed')
      })
    })

    return { started: true }
  })

  typedHandle('database-tools:cancel', async ({ jobId }, event) => {
    const job = jobs.get(jobId)
    if (!job || job.ownerId !== event.sender.id) return { cancelled: false }
    const cancelled = job.child.kill()
    job.cancelled = cancelled
    return { cancelled }
  })
}
