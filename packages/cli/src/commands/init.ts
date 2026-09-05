import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { runAction } from '../lib/output'
import { CliError } from '../lib/errors'
import type { Command } from 'commander'

const SNIPPET = `# DBDesk

This project uses DBDesk (Postgres connections + dashboards). The \`dbdesk\` CLI is available in this environment.

Rules for agents:
- Always pass \`--format json\` and check the \`ok\` field. Errors use \`{ ok: false, error: { code, message, hint } }\`.
- Never guess schema: start with \`dbdesk schema tree --connection <name>\`, then \`dbdesk schema info --connection <name> --schema public --table <table>\`.
- Only SELECT/SHOW via the CLI. Never INSERT/UPDATE/DELETE/DROP.
- Dashboards are code: \`dbdesk dashboard export <id>\` to read, \`dbdesk dashboard apply -f dashboard.yaml\` to write. Validate first with \`dbdesk dashboard validate -f dashboard.yaml\`.
- Full guide: \`dbdesk skill print\`.

Quickstart:
\`\`\`bash
dbdesk connection list --format json
dbdesk schema tree --connection <name> --format json
dbdesk query "SELECT count(*) FROM <table>" --connection <name> --format json
\`\`\`
`

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Write an AGENTS.md snippet so agents in this project use dbdesk correctly')
    .option(
      '--path <dir>',
      'directory to write AGENTS.md into (default: current directory)',
      process.cwd()
    )
    .option('--print', 'print the snippet instead of writing')
    .option('--force', 'overwrite an existing AGENTS.md')
    .option('--format <format>', 'output format: table (default) or json', 'table')
    .action((opts: { path: string; print?: boolean; force?: boolean; format: string }) =>
      runAction(opts, ['table', 'json'], () => {
        if (opts.print) {
          return SNIPPET
        }
        const dest = join(opts.path, 'AGENTS.md')
        if (existsSync(dest) && !opts.force) {
          throw new CliError(
            'validation-failed',
            `AGENTS.md already exists at ${dest}.`,
            'Re-run with --force to overwrite, or --print to review the snippet first.'
          )
        }
        mkdirSync(dirname(dest), { recursive: true })
        writeFileSync(dest, SNIPPET)
        return {
          written: dest,
          message: `Wrote agent instructions to ${dest}. Run "dbdesk skill install" to add the full guide.`
        }
      })
    )
}
