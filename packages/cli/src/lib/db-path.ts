import { homedir } from 'node:os'
import { join } from 'node:path'

export function getDbPath(): string {
  const override = process.env.DBDESK_DB_PATH
  if (override) return override

  const home = homedir()
  const platform = process.platform

  switch (platform) {
    case 'darwin':
      return join(home, 'Library', 'Application Support', 'dbdesk', 'dbdesk.sqlite')
    case 'linux':
      const xdgConfig = process.env.XDG_CONFIG_HOME || join(home, '.config')
      return join(xdgConfig, 'dbdesk', 'dbdesk.sqlite')
    case 'win32':
      const appData = process.env.APPDATA || join(home, 'AppData', 'Roaming')
      return join(appData, 'dbdesk', 'dbdesk.sqlite')
    default:
      throw new Error(`Unsupported platform: ${platform}`)
  }
}
