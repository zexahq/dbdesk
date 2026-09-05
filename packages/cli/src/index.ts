import { Command } from 'commander'
import { registerConnectionCommands } from './commands/connections'
import { registerSchemaCommands } from './commands/schema'
import { registerTableCommands } from './commands/table'
import { registerQueryCommands } from './commands/query'
import { registerSavedQueryCommands } from './commands/saved-query'
import { registerDashboardCommands } from './commands/dashboards'
import { registerDoctorCommand } from './commands/doctor'
import { registerSkillCommands } from './commands/skill'
import { registerInitCommand } from './commands/init'
import { registerOpenCommand } from './commands/open'
import { shutdownDb } from './lib/db-access'
import { disconnectAll } from './lib/adapter-pool'
import { beginCommand, reportError } from './lib/output'
import { cliVersion } from './lib/paths'
import { maybeNotifyUpdate } from './lib/update-check'
import { printStatusSummary } from './lib/status'

const program = new Command()

program
  .name('dbdesk')
  .description(
    'DBDesk CLI — manage Postgres connections, run queries, and build dashboards from the terminal'
  )
  .version(cliVersion(), '-v, --version', 'output the dbdesk version')
  .option('--quiet', 'suppress update notices and warnings')
  .addHelpText(
    'after',
    `
Examples:
  $ dbdesk connection list
  $ dbdesk schema tree --connection prod
  $ dbdesk table rows --connection prod --schema public --table users
  $ dbdesk query "SELECT * FROM users LIMIT 10" --connection prod
  $ dbdesk dashboard apply -f dashboard.yaml
  $ dbdesk doctor

Tip: set DBDESK_CONNECTION once to skip --connection on every command.
AI agents: run \`dbdesk skill print\` for the full agent guide.
`
  )
  .exitOverride((err) => {
    if (
      err.code === 'commander.displayHelp' ||
      err.code === 'commander.helpDisplayed' ||
      err.code === 'commander.displayVersion' ||
      err.code === 'commander.version'
    ) {
      process.exit(0)
    }
    console.error(`Error [usage]: ${err.message}`)
    process.exit(2)
  })

program.hook('preAction', async (_thisCommand, actionCommand) => {
  beginCommand(actionCommand.name())
  const quiet = Boolean(program.opts<{ quiet?: boolean }>().quiet)
  await maybeNotifyUpdate(quiet)
})

registerDoctorCommand(program)
registerConnectionCommands(program)
registerSchemaCommands(program)
registerTableCommands(program)
registerQueryCommands(program)
registerSavedQueryCommands(program)
registerDashboardCommands(program)
registerSkillCommands(program)
registerInitCommand(program)
registerOpenCommand(program)

// Bare `dbdesk` (no subcommand): friendly status summary instead of help spam.
// (A program-level .action() would shadow subcommands in commander, so we
// branch before parsing.) Only global flags may accompany it.
function parseBareArgs(argv: string[]): { bare: boolean; format: 'table' | 'json' } {
  let format: 'table' | 'json' = 'table'
  const rest: string[] = []
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] as string
    if (arg === '--quiet') continue
    if (arg === '--format' && typeof argv[i + 1] === 'string') {
      const value = (argv[i + 1] as string).toLowerCase()
      if (value === 'json' || value === 'table') format = value
      i++
      continue
    }
    rest.push(arg)
  }
  return { bare: rest.length === 0, format }
}

const { bare: isBare, format: bareFormat } = parseBareArgs(process.argv.slice(2))

async function main(): Promise<void> {
  if (isBare) {
    beginCommand('status')
    try {
      await printStatusSummary(bareFormat)
    } catch (err) {
      process.exit(reportError(err, bareFormat))
    }
    await cleanup()
    return
  }
  await program.parseAsync(process.argv)
}

async function cleanup(): Promise<void> {
  try {
    await disconnectAll()
  } catch {}
  try {
    shutdownDb()
  } catch {}
}

process.on('SIGINT', () => {
  cleanup().then(() => process.exit(0))
})

process.on('SIGTERM', () => {
  cleanup().then(() => process.exit(0))
})

program.hook('postAction', () => {
  cleanup().catch(() => {})
})

main().catch((err: unknown) => {
  process.exit(reportError(err, 'table'))
})
