import { getDbPath } from './db-path'
import { listConnections, listDashboards } from './db-access'
import { cliVersion } from './paths'

/** Human-readable summary for bare `dbdesk` (no subcommand). */
export async function printStatusSummary(): Promise<void> {
  const version = cliVersion()
  console.log(`dbdesk v${version}`)

  let dbPath: string
  try {
    dbPath = getDbPath()
  } catch (err) {
    console.log(`\n${err instanceof Error ? err.message : String(err)}`)
    return
  }
  console.log(`Data: ${dbPath}`)

  try {
    const connections = listConnections()
    console.log(
      `Connections: ${connections.length > 0 ? connections.map((c) => c.name).join(', ') : '(none yet)'}`
    )
    if (connections.length === 0) {
      console.log('\nGet started: dbdesk connection add --help')
      return
    }
    const first = connections[0]
    if (first) {
      const dashboards = listDashboards(first.id)
      console.log(`Dashboards on "${first.name}": ${dashboards.length}`)
    }
    console.log('\nNext: dbdesk schema tree --connection <name> | dbdesk --help')
  } catch (err) {
    console.log(`\n${err instanceof Error ? err.message : String(err)}`)
    console.log('Get started: dbdesk connection add --help')
  }
}
