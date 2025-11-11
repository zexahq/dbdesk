import { promises as fs } from 'node:fs'
import { dirname, join } from 'node:path'
import { app } from 'electron'
import type { ConnectionProfile } from '@common/types'

const STORAGE_FILENAME = 'connections.json'

type StoredConnectionProfile = Omit<
  ConnectionProfile,
  'createdAt' | 'updatedAt' | 'lastConnectedAt'
> & {
  createdAt: string
  updatedAt: string
  lastConnectedAt?: string
}

const getStoragePath = (): string => join(app.getPath('userData'), STORAGE_FILENAME)

const serializeProfile = (profile: ConnectionProfile): StoredConnectionProfile => ({
  ...profile,
  createdAt: profile.createdAt.toISOString(),
  updatedAt: profile.updatedAt.toISOString(),
  lastConnectedAt: profile.lastConnectedAt?.toISOString()
})

const deserializeProfile = (stored: StoredConnectionProfile): ConnectionProfile =>
  ({
    ...stored,
    createdAt: new Date(stored.createdAt),
    updatedAt: new Date(stored.updatedAt),
    lastConnectedAt: stored.lastConnectedAt ? new Date(stored.lastConnectedAt) : undefined
  }) as ConnectionProfile

const readProfilesFromDisk = async (): Promise<StoredConnectionProfile[]> => {
  const filePath = getStoragePath()

  try {
    const content = await fs.readFile(filePath, 'utf8')
    return JSON.parse(content) as StoredConnectionProfile[]
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return []
    }

    throw error
  }
}

const writeProfilesToDisk = async (profiles: StoredConnectionProfile[]): Promise<void> => {
  const filePath = getStoragePath()
  await fs.mkdir(dirname(filePath), { recursive: true }).catch(() => {})
  await fs.writeFile(filePath, JSON.stringify(profiles, null, 2), 'utf8')
}

export const loadProfiles = async (): Promise<ConnectionProfile[]> => {
  const storedProfiles = await readProfilesFromDisk()
  return storedProfiles.map(deserializeProfile)
}

export const getProfile = async (profileId: string): Promise<ConnectionProfile | undefined> => {
  const profiles = await loadProfiles()
  const profile = profiles.find((profile) => profile.id === profileId)

  if (!profile) {
    return undefined
  }
  return profile
}

export const saveProfile = async (profile: ConnectionProfile): Promise<void> => {
  const storedProfiles = await readProfilesFromDisk()
  const index = storedProfiles.findIndex((item) => item.id === profile.id)

  const serializedProfile = serializeProfile(profile)

  if (index >= 0) {
    storedProfiles[index] = serializedProfile
  } else {
    storedProfiles.push(serializedProfile)
  }

  await writeProfilesToDisk(storedProfiles)
}

export const deleteProfile = async (profileId: string): Promise<void> => {
  const storedProfiles = await readProfilesFromDisk()
  const filteredProfiles = storedProfiles.filter((profile) => profile.id !== profileId)

  await writeProfilesToDisk(filteredProfiles)
}
