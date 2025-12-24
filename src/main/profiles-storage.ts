import type { DBConnectionOptions } from '@common/types'
import { promises as fs } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

const PROFILES_FILENAME = 'profiles.json'

type StoredProfile = {
  id: string
  name: string
  type: string
  options: DBConnectionOptions
}

type StoredProfiles = {
  [id: string]: StoredProfile
}

const getProfilesPath = (): string => {
  const base = process.env.DB_DESK_USER_DATA ?? homedir()
  return join(base, '.dbdesk', PROFILES_FILENAME)
}

// Synchronous loader used during ConnectionManager initialization
export function readProfilesFromDiskSync(): StoredProfiles {
  const filePath = getProfilesPath()
  try {
    // Use sync API for predictable startup load
    // eslint-disable-next-line node/no-sync
    const fsSync = require('node:fs')
    if (!fsSync.existsSync(filePath)) return {}
    const content = fsSync.readFileSync(filePath, 'utf8')
    if (!content || content.trim() === '') return {}
    return JSON.parse(content) as StoredProfiles
  } catch (err) {
    // If corrupted or unreadable, surface as empty so server can continue
    // Caller may log the error
    return {}
  }
}

// Async writer used to persist profiles after changes
export async function writeProfilesToDisk(profiles: StoredProfiles): Promise<void> {
  const filePath = getProfilesPath()
  await fs.mkdir(dirname(filePath), { recursive: true }).catch(() => {})
  await fs.writeFile(filePath, JSON.stringify(profiles, null, 2), 'utf8')
}

export type { StoredProfiles }
