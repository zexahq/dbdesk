import type { ConnectionWorkspace, WorkspaceStorage } from '@common/types'
import { app } from 'electron'
import { promises as fs } from 'node:fs'
import { dirname, join } from 'node:path'

const WORKSPACE_FILENAME = 'workspaces.json'

type StoredWorkspace = Omit<ConnectionWorkspace, 'lastUpdated'> & {
  lastUpdated: string
}

type StoredWorkspaceStorage = {
  [connectionId: string]: StoredWorkspace
}

const getWorkspaceStoragePath = (): string => join(app.getPath('userData'), WORKSPACE_FILENAME)

const serializeWorkspace = (workspace: ConnectionWorkspace): StoredWorkspace => ({
  ...workspace,
  lastUpdated: workspace.lastUpdated.toISOString()
})

const deserializeWorkspace = (stored: StoredWorkspace): ConnectionWorkspace => ({
  ...stored,
  lastUpdated: new Date(stored.lastUpdated)
})

const readWorkspacesFromDisk = async (): Promise<StoredWorkspaceStorage> => {
  const filePath = getWorkspaceStoragePath()

  try {
    const content = await fs.readFile(filePath, 'utf8')
    if (content.trim() === '') {
      return {}
    }

    return JSON.parse(content) as StoredWorkspaceStorage
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {}
    }

    if (error instanceof SyntaxError) {
      console.warn(`Workspace storage file is corrupted, resetting: ${error.message}`)
      return {}
    }

    throw error
  }
}

const writeWorkspacesToDisk = async (workspaces: StoredWorkspaceStorage): Promise<void> => {
  const filePath = getWorkspaceStoragePath()
  await fs.mkdir(dirname(filePath), { recursive: true }).catch(() => {})
  await fs.writeFile(filePath, JSON.stringify(workspaces, null, 2), 'utf8')
}

export const loadWorkspace = async (
  connectionId: string
): Promise<ConnectionWorkspace | undefined> => {
  const workspaces = await readWorkspacesFromDisk()
  const storedWorkspace = workspaces[connectionId]

  if (!storedWorkspace) {
    return undefined
  }

  return deserializeWorkspace(storedWorkspace)
}

export const saveWorkspace = async (workspace: ConnectionWorkspace): Promise<void> => {
  const workspaces = await readWorkspacesFromDisk()
  const serializedWorkspace = serializeWorkspace(workspace)

  workspaces[workspace.connectionId] = serializedWorkspace

  await writeWorkspacesToDisk(workspaces)
}

export const deleteWorkspace = async (connectionId: string): Promise<void> => {
  const workspaces = await readWorkspacesFromDisk()

  if (workspaces[connectionId]) {
    delete workspaces[connectionId]
    await writeWorkspacesToDisk(workspaces)
  }
}

export const loadAllWorkspaces = async (): Promise<WorkspaceStorage> => {
  const storedWorkspaces = await readWorkspacesFromDisk()
  const workspaces: WorkspaceStorage = {}

  for (const [connectionId, storedWorkspace] of Object.entries(storedWorkspaces)) {
    workspaces[connectionId] = deserializeWorkspace(storedWorkspace)
  }

  return workspaces
}
