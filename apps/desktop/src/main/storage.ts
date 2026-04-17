import type { ConnectionProfile } from '@dbdesk/shared/types'
import { eq, getDb, connectionProfiles } from '@dbdesk/db'

const toProfile = (row: typeof connectionProfiles.$inferSelect): ConnectionProfile =>
  ({
    id: row.id,
    name: row.name,
    type: row.type,
    options: JSON.parse(row.optionsJson),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    lastConnectedAt: row.lastConnectedAt !== null ? new Date(row.lastConnectedAt) : undefined
  }) as ConnectionProfile

export const loadProfiles = async (): Promise<ConnectionProfile[]> => {
  const rows = getDb().select().from(connectionProfiles).all()
  return rows.map(toProfile)
}

export const getProfile = async (profileId: string): Promise<ConnectionProfile | undefined> => {
  const row = getDb()
    .select()
    .from(connectionProfiles)
    .where(eq(connectionProfiles.id, profileId))
    .get()

  return row ? toProfile(row) : undefined
}

export const saveProfile = async (profile: ConnectionProfile): Promise<void> => {
  getDb()
    .insert(connectionProfiles)
    .values({
      id: profile.id,
      name: profile.name,
      type: profile.type,
      optionsJson: JSON.stringify(profile.options),
      createdAt: profile.createdAt.getTime(),
      updatedAt: profile.updatedAt.getTime(),
      lastConnectedAt: profile.lastConnectedAt?.getTime() ?? null
    })
    .onConflictDoUpdate({
      target: connectionProfiles.id,
      set: {
        name: profile.name,
        type: profile.type,
        optionsJson: JSON.stringify(profile.options),
        updatedAt: profile.updatedAt.getTime(),
        lastConnectedAt: profile.lastConnectedAt?.getTime() ?? null
      }
    })
    .run()
}

export const deleteProfile = async (profileId: string): Promise<void> => {
  getDb().delete(connectionProfiles).where(eq(connectionProfiles.id, profileId)).run()
}
