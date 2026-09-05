import { execSync } from 'node:child_process'
import type { Command } from 'commander'

export function registerOpenCommand(program: Command): void {
  program
    .command('open', { isDefault: true })
    .description('Open the DBDesk app')
    .action(() => {
      const platform = process.platform

      try {
        switch (platform) {
          case 'darwin':
            execSync('open -a DBDesk', { stdio: 'ignore', encoding: 'utf-8' })
            break
          case 'linux':
            execSync('dbdesk', { stdio: 'ignore', encoding: 'utf-8' })
            break
          case 'win32':
            execSync('start dbdesk:', { stdio: 'ignore', encoding: 'utf-8', shell: true } as never)
            break
          default:
            console.error(`Cannot open DBDesk on platform: ${platform}`)
            process.exit(1)
        }
        console.log('DBDesk launched.')
      } catch {
        console.error(
          'Could not launch DBDesk. Make sure it is installed.\n' +
            'Download from: https://github.com/zexahq/dbdesk/releases'
        )
        process.exit(1)
      }
    })
}
