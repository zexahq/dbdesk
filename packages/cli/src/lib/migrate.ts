import { currentSchemaVersion, runMigrations, supportedSchemaVersion } from '@dbdesk/db'
import { migrationsDir } from './paths'
import { CliError } from './errors'

/**
 * Bring the local SQLite file up to this binary's schema and refuse to run
 * when the file was created by a NEWER release (forward-only migrations).
 */
export function ensureMigrated(): { version: number; migrated: boolean } {
  const folder = migrationsDir()
  const supported = supportedSchemaVersion(folder)
  const current = currentSchemaVersion()

  if (supported > 0 && current > supported) {
    throw new CliError(
      'schema-newer',
      `This data file uses schema v${current}, but this dbdesk only supports up to v${supported}.`,
      'Update dbdesk (`npm i -g dbdesk@latest`) or open the DBDesk desktop app to upgrade.'
    )
  }

  if (supported === 0 || current >= supported) {
    return { version: current, migrated: false }
  }

  runMigrations(folder)
  return { version: currentSchemaVersion(), migrated: true }
}
