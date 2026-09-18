import type { ConnectionProfile } from '@dbdesk/shared/types'
import { connectionProfileSchema } from '@dbdesk/shared/schemas'
import { eq, getDb, connectionProfiles } from '@dbdesk/db'
import { decryptFromStorage, encryptForStorage } from './lib/secure-storage'

const SECRET_KEYS = new Set(['password', 'connectionString'])
const ephemeralSecrets = new Map<string, Record<string, unknown>>()

export const splitConnectionOptions = (
  options: Record<string, unknown>
): { publicOptions: Record<string, unknown>; secrets: Record<string, unknown> } => {
  const publicOptions: Record<string, unknown> = {}
  const secrets: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(options)) {
    if (SECRET_KEYS.has(key)) secrets[key] = value
    else publicOptions[key] = value
  }

  return { publicOptions, secrets }
}

export const chooseStoredSecret = (
  encryptedSecret: string | null,
  existingSecret: string | null | undefined
): string | null => encryptedSecret ?? existingSecret ?? null

const toProfile = (row: typeof connectionProfiles.$inferSelect): ConnectionProfile => {
  let options: Record<string, unknown> = {}
  try {
    options = JSON.parse(row.optionsJson)
  } catch {
    console.warn(`[storage] Failed to parse options for profile ${row.id}`)
  }

  const { publicOptions, secrets: legacySecrets } = splitConnectionOptions(options)
  let secrets = ephemeralSecrets.get(row.id) ?? legacySecrets

  if (row.secretJson) {
    const decrypted = decryptFromStorage(row.secretJson)
    if (decrypted) {
      try {
        secrets = JSON.parse(decrypted) as Record<string, unknown>
      } catch {
        console.warn(`[storage] Failed to parse encrypted secrets for profile ${row.id}`)
      }
    }
  }

  if (Object.keys(legacySecrets).length > 0) {
    const encrypted = encryptForStorage(JSON.stringify(legacySecrets))
    if (!encrypted) ephemeralSecrets.set(row.id, legacySecrets)
    getDb()
      .update(connectionProfiles)
      .set({
        optionsJson: JSON.stringify(publicOptions),
        secretJson: chooseStoredSecret(encrypted, row.secretJson)
      })
      .where(eq(connectionProfiles.id, row.id))
      .run()
  }

  const profile = {
    id: row.id,
    name: row.name,
    type: row.type,
    options: { ...publicOptions, ...secrets },
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    lastConnectedAt: row.lastConnectedAt !== null ? new Date(row.lastConnectedAt) : undefined
  } as unknown as ConnectionProfile

  const parsed = connectionProfileSchema.safeParse(profile)
  return parsed.success ? (parsed.data as ConnectionProfile) : profile
}

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
  const { publicOptions, secrets } = splitConnectionOptions(
    profile.options as unknown as Record<string, unknown>
  )
  const encryptedSecretJson = Object.keys(secrets).length
    ? encryptForStorage(JSON.stringify(secrets))
    : null
  const existingSecretJson = getDb()
    .select({ secretJson: connectionProfiles.secretJson })
    .from(connectionProfiles)
    .where(eq(connectionProfiles.id, profile.id))
    .get()?.secretJson
  const secretJson = chooseStoredSecret(encryptedSecretJson, existingSecretJson)

  if (!encryptedSecretJson && Object.keys(secrets).length) {
    ephemeralSecrets.set(profile.id, secrets)
    console.warn(
      `[storage] OS encryption unavailable; credentials for "${profile.name}" will only be kept for this session. Configure ~/.pgpass for persistent passwordless access.`
    )
  } else if (encryptedSecretJson) {
    ephemeralSecrets.delete(profile.id)
  }

  getDb()
    .insert(connectionProfiles)
    .values({
      id: profile.id,
      name: profile.name,
      type: profile.type,
      optionsJson: JSON.stringify(publicOptions),
      secretJson,
      createdAt: profile.createdAt.getTime(),
      updatedAt: profile.updatedAt.getTime(),
      lastConnectedAt: profile.lastConnectedAt?.getTime() ?? null
    })
    .onConflictDoUpdate({
      target: connectionProfiles.id,
      set: {
        name: profile.name,
        type: profile.type,
        optionsJson: JSON.stringify(publicOptions),
        secretJson,
        updatedAt: profile.updatedAt.getTime(),
        lastConnectedAt: profile.lastConnectedAt?.getTime() ?? null
      }
    })
    .run()
}

export const deleteProfile = async (profileId: string): Promise<void> => {
  ephemeralSecrets.delete(profileId)
  getDb().delete(connectionProfiles).where(eq(connectionProfiles.id, profileId)).run()
}
