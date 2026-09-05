import { formatTable } from './format'
import { cliVersion } from './paths'
import { exitCodeFor, isCliError } from './errors'

export type OutputFormat = 'table' | 'json' | 'csv'

let commandName = 'dbdesk'
let startedAt = Date.now()
let warnings: string[] = []

export function beginCommand(name: string): void {
  commandName = name
  startedAt = Date.now()
  warnings = []
}

/** Collect a non-fatal warning, surfaced in meta (JSON) and stderr (all formats). */
export function warn(message: string): void {
  warnings.push(message)
}

function takeWarnings(): string[] {
  const taken = warnings
  warnings = []
  return taken
}

interface Meta {
  command: string
  version: string
  duration_ms: number
  warnings?: string[]
}

function meta(): Meta {
  const base: Meta = { command: commandName, version: cliVersion(), duration_ms: Date.now() - startedAt }
  const taken = takeWarnings()
  if (taken.length > 0) base.warnings = taken
  return base
}

function flushWarnings(w: string[]): void {
  for (const message of w) {
    console.error(`Warning: ${message}`)
  }
}

export function toTable(data: unknown): string {
  if (data === null || data === undefined) return ''
  if (typeof data === 'string') return data
  if (Array.isArray(data)) {
    if (data.length === 0) return '(empty)'
    if (typeof data[0] === 'object' && data[0] !== null) {
      return formatTable(data as Record<string, unknown>[])
    }
    return data.map((v) => String(v)).join('\n')
  }
  if (typeof data === 'object') {
    return formatTable(
      Object.entries(data as Record<string, unknown>).map(([key, value]) => ({
        key,
        value: typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')
      }))
    )
  }
  return String(data)
}

export function toCsv(data: unknown): string {
  const rows = Array.isArray(data) ? data : [data]
  if (rows.length === 0) return ''
  if (typeof rows[0] !== 'object' || rows[0] === null) {
    return rows.map((v) => JSON.stringify(String(v ?? ''))).join('\n')
  }
  const keys = Object.keys(rows[0] as Record<string, unknown>)
  const header = keys.join(',')
  const body = rows
    .map((r) =>
      keys.map((k) => JSON.stringify(String((r as Record<string, unknown>)[k] ?? ''))).join(',')
    )
    .join('\n')
  return header + '\n' + body
}

/**
 * Print command data to stdout. JSON mode always uses the
 * `{ ok: true, data, meta }` envelope; tables/CSV print raw values.
 */
export function writeData(data: unknown, format: OutputFormat): void {
  switch (format) {
    case 'json': {
      const m = meta()
      console.log(JSON.stringify({ ok: true, data, meta: m }, null, 2))
      if (m.warnings) flushWarnings(m.warnings)
      break
    }
    case 'csv':
      console.log(toCsv(data))
      flushWarnings(takeWarnings())
      break
    default:
      console.log(toTable(data))
      flushWarnings(takeWarnings())
      break
  }
}

/**
 * Print an error (stderr) and return the process exit code.
 * JSON mode uses the `{ ok: false, error: { code, message, hint }, meta }` envelope.
 */
export function reportError(err: unknown, format: OutputFormat): number {
  if (isCliError(err)) {
    if (format === 'json') {
      console.error(
        JSON.stringify(
          {
            ok: false,
            error: { code: err.code, message: err.message, ...(err.hint ? { hint: err.hint } : {}) },
            meta: meta()
          },
          null,
          2
        )
      )
    } else {
      console.error(`Error [${err.code}]: ${err.message}`)
      if (err.hint) console.error(`Hint: ${err.hint}`)
      flushWarnings(takeWarnings())
    }
    return exitCodeFor(err.code)
  }

  const message = err instanceof Error ? err.message : String(err)
  if (format === 'json') {
    console.error(
      JSON.stringify({ ok: false, error: { code: 'db-error', message }, meta: meta() }, null, 2)
    )
  } else {
    console.error(`Error: ${message}`)
    flushWarnings(takeWarnings())
  }
  return 5
}

export function safeFormat(raw: unknown, allowed: OutputFormat[] = ['table', 'json']): OutputFormat {
  const value = typeof raw === 'string' ? raw.toLowerCase() : 'table'
  if ((allowed as string[]).includes(value)) return value as OutputFormat
  return 'table'
}

/**
 * Standard action wrapper: parses `--format`, runs `fn`, prints the envelope,
 * and exits non-zero with a coded error on failure.
 */
export async function runAction(
  opts: { format?: unknown },
  allowed: OutputFormat[],
  fn: (format: OutputFormat) => unknown | Promise<unknown>
): Promise<void> {
  const format = safeFormat(opts.format, allowed)
  if (typeof opts.format === 'string' && format === 'table' && !(allowed as string[]).includes(opts.format.toLowerCase())) {
    warn(`Unknown format "${opts.format}". Valid formats: ${allowed.join(', ')}. Using table.`)
  }
  try {
    const data = await fn(format)
    writeData(data, format)
  } catch (err) {
    process.exit(reportError(err, format))
  }
}
