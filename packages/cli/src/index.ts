import { Command } from 'commander'
import { registerConnectionCommands } from './commands/connections'
import { registerSchemaCommands } from './commands/schema'
import { registerQueryCommands } from './commands/query'
import { registerDashboardCommands } from './commands/dashboards'
import { registerOpenCommand } from './commands/open'
import { shutdownDb, ensureDb } from './lib/db-access'
import { disconnectAll } from './lib/adapter-pool'

const program = new Command()

program
  .name('dbdesk')
  .description('DBDesk CLI — manage databases and dashboards from the terminal')
  .version('0.1.7')
  .addHelpText(
    'after',
    `
Examples:
  $ dbdesk connection list
  $ dbdesk schema tree --connection prod
  $ dbdesk query "SELECT * FROM users LIMIT 10" --connection prod
  $ dbdesk dashboard create --name "Sales KPIs" --connection prod
  $ dbdesk dashboard add-widget --type kpi --title "Users" \\
      --query "SELECT count(*) FROM users" --connection prod --dashboard <id>
  `
  )

registerOpenCommand(program)
registerConnectionCommands(program)
registerSchemaCommands(program)
registerQueryCommands(program)
registerDashboardCommands(program)

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

program.parseAsync().catch((err: unknown) => {
  console.error(String(err))
  cleanup().then(() => process.exit(1))
})
