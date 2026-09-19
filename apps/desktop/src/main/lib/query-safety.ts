import type { ConnectionProfile } from '@dbdesk/shared/types'

export const shouldRunReadOnly = (
  profile: ConnectionProfile | undefined,
  requestedReadOnly = false
): boolean =>
  requestedReadOnly || (profile?.type === 'postgres' && profile.options.readOnly === true)

export const assertConnectionWritable = (profile: ConnectionProfile | undefined): void => {
  if (profile?.type === 'postgres' && profile.options.readOnly) {
    throw new Error(`Connection "${profile.name}" is read-only`)
  }
}
