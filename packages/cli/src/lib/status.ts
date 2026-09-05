import { getDbPath } from './db-path'
import { listConnections, listDashboards } from './db-access'
import { cliVersion } from './paths'
import { writeData, type OutputFormat } from './output'

interface StatusSummary {
  version: string
  dbPath: string
  connections: { name: string; dashboards: number }[]
}

function buildSummary(): StatusSummary {
  const connections = listConnections()
  return {
    version: cliVersion(),
    dbPath: getDbPath(),
    connections: connections.map((c) => ({
      name: c.name,
      dashboards: listDashboards(c.id).length
    }))
  }
}

/** Summary for bare `dbdesk` (no subcommand): human text or JSON envelope. */
export async function printStatusSummary(format: OutputFormat = 'table'): Promise<void> {
  if (format === 'json') {
    writeData(buildSummary(), 'json')
    return
  }

  const version = cliVersion()
  console.log(`dbdesk v${version}`)

  let summary: StatusSummary
  try {
    summary = buildSummary()
  } catch (err) {
    console.log(`\n${err instanceof Error ? err.message : String(err)}`)
    console.log('Get started: dbdesk connection add --help')
    return
  }
  console.log(`Data: ${summary.dbPath}`)

  if (summary.connections.length === 0) {
    console.log('Connections: (none yet)')
    console.log('\nGet started: dbdesk connection add --help')
    return
  }
  console.log(`Connections: ${summary.connections.map((c) => c.name).join(', ')}`)
  const first = summary.connections[0]
  if (first) {
    console.log(`Dashboards on "${first.name}": ${first.dashboards}`)
  }
  console.log('\nNext: dbdesk schema tree --connection <name> | dbdesk --help')
}
