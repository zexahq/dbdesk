/**
 * Read-only mode enforcement.
 *
 * A connection profile is read-only when its SQL options carry
 * `readOnly: true`. All write-bound IPC handlers must call
 * `assertWritable(connectionId)` before mutating the database.
 */
import type { ConnectionProfile, SQLConnectionOptions } from '@dbdesk/shared/types'
import { getProfile } from '../storage'
import { ValidationError } from '../utils/errors'

export const isProfileReadOnly = (profile: ConnectionProfile | undefined): boolean => {
  if (!profile) return false
  if (profile.type !== 'postgres') return false
  return (profile.options as SQLConnectionOptions).readOnly === true
}

export const assertWritable = async (connectionId: string): Promise<void> => {
  const profile = await getProfile(connectionId)
  if (isProfileReadOnly(profile)) {
    throw new ValidationError(
      `Connection "${profile?.name ?? connectionId}" is read-only. Disable read-only mode in the connection settings to perform writes.`
    )
  }
}
