import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { getDbPath } from '../lib/db-path'
import { listConnections } from '../lib/db-access'
import { currentSchemaVersion, supportedSchemaVersion } from '@dbdesk/db'
import { migrationsDir, cliVersion, skillDir } from '../lib/paths'
import { safeFormat, writeData, reportError } from '../lib/output'
import type { Command } from 'commander'

interface Check {
  check: string
  status: 'ok' | 'warn' | 'fail'
  detail: string
}

function isOnPath(): { found: boolean; detail: string } {
  const pathEnv = process.env.PATH ?? ''
  const dirs = pathEnv.split(process.platform === 'win32' ? ';' : ':')
  try {
    const cmd = process.platform === 'win32' ? 'where' : 'which'
    const out = execFileSync(cmd, ['dbdesk'], { encoding: 'utf-8', timeout: 5000 }).trim()
    const onGuiPath = dirs.some((d) => d && out.startsWith(d))
    return {
      found: true,
      detail: onGuiPath ? out : `${out} (outside GUI PATH — terminal-only)`
    }
  } catch {
    return { found: false, detail: 'dbdesk not found on PATH' }
  }
}

export function registerDoctorCommand(program: Command): void {
  program
    .command('doctor')
    .description('Check the dbdesk installation, data file, and environment')
    .option('--format <format>', 'output format: table (default) or json', 'table')
    .action(async (opts: { format: string }) => {
      const format = safeFormat(opts.format, ['table', 'json'])
      try {
        const data = buildReport()
        writeData(data, format)
        if (!data.healthy) process.exit(1)
      } catch (err) {
        process.exit(reportError(err, format))
      }
    })
}

function buildReport(): { healthy: boolean; checks: Check[] } {
        const checks: Check[] = []

        checks.push({ check: 'binary', status: 'ok', detail: `${process.argv[1] ?? 'dbdesk'} (v${cliVersion()})` })
        checks.push({
          check: 'node',
          status: 'ok',
          detail: process.version,
        })

        try {
          const dbPath = getDbPath()
          const readable = existsSync(dbPath)
          checks.push({
            check: 'data-file',
            status: readable ? 'ok' : 'warn',
            detail: readable ? dbPath : `${dbPath} (not created yet — runs on first command)`
          })
        } catch (err) {
          checks.push({
            check: 'data-file',
            status: 'fail',
            detail: err instanceof Error ? err.message : String(err)
          })
        }

        try {
          const folder = migrationsDir()
          const supported = supportedSchemaVersion(folder)
          const current = currentSchemaVersion()
          checks.push({
            check: 'schema',
            status: current > supported ? 'fail' : 'ok',
            detail:
              current > supported
                ? `data is v${current}, this dbdesk supports v${supported} — update dbdesk`
                : `v${current} (supported: v${supported})`
          })
        } catch (err) {
          checks.push({
            check: 'schema',
            status: 'warn',
            detail: err instanceof Error ? err.message : String(err)
          })
        }

        try {
          const connections = listConnections()
          checks.push({
            check: 'connections',
            status: 'ok',
            detail: connections.length === 0 ? 'none yet — dbdesk connection add --help' : `${connections.length} saved`
          })
        } catch (err) {
          checks.push({
            check: 'connections',
            status: 'fail',
            detail: err instanceof Error ? err.message : String(err)
          })
        }

        const pathCheck = isOnPath()
        checks.push({
          check: 'on-path',
          status: pathCheck.found ? 'ok' : 'warn',
          detail: pathCheck.detail
        })

        try {
          skillDir()
          checks.push({ check: 'skill', status: 'ok', detail: 'agent guide bundled (dbdesk skill print)' })
        } catch {
          checks.push({ check: 'skill', status: 'warn', detail: 'agent guide not found in this install' })
        }

        const healthy = checks.every((c) => c.status !== 'fail')
        return { healthy, checks }
}
