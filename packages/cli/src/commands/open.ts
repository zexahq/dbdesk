import { execSync } from 'node:child_process'
import { runAction } from '../lib/output'
import type { Command } from 'commander'

export function registerOpenCommand(program: Command): void {
  program
    .command('open')
    .description('Open the DBDesk desktop app')
    .option('--format <format>', 'output format: table (default) or json', 'table')
    .action((opts: { format: string }) =>
      runAction(opts, ['table', 'json'], () => {
        const platform = process.platform
        try {
          switch (platform) {
            case 'darwin':
              execSync('open -a DBDesk', { stdio: 'ignore', encoding: 'utf-8' })
              break
            case 'linux':
              // Prefer the installed GUI binary; fall back to the protocol handler.
              try {
                execSync('/opt/dbdesk/dbdesk', { stdio: 'ignore', encoding: 'utf-8' })
              } catch {
                execSync('xdg-open "dbdesk:"', { stdio: 'ignore', encoding: 'utf-8', shell: '/bin/sh' })
              }
              break
            case 'win32':
              execSync('start "" "dbdesk:"', { stdio: 'ignore', encoding: 'utf-8', shell: 'cmd.exe' })
              break
            default:
              throw new Error(`Unsupported platform: ${platform}`)
          }
        } catch {
          throw new Error(
            'Could not launch DBDesk. Make sure it is installed (https://github.com/zexahq/dbdesk/releases).'
          )
        }
        return { launched: true, message: 'DBDesk launched.' }
      })
    )
}
