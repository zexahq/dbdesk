import type { ConnectionWorkspace, WorkspaceStorage } from '@dbdesk/shared/types'
import { eq, getDb, connectionProfiles } from '@dbdesk/db'

export const loadWorkspace = async (
  connectionId: string
): Promise<ConnectionWorkspace | undefined> => {
  const row = getDb()
    .select()
    .from(connectionProfiles)
    .where(eq(connectionProfiles.id, connectionId))
    .get()

  if (!row || !row.tabsJson) return undefined

  let tabs: unknown[] = []
  try {
    tabs = JSON.parse(row.tabsJson)
  } catch {
    console.warn(`[workspace] Failed to parse tabs for connection ${connectionId}`)
  }

  return {
    connectionId: row.id,
    tabs,
    activeTabId: row.activeTabId ?? null
  }
}

export const saveWorkspace = async (workspace: ConnectionWorkspace): Promise<void> => {
  getDb()
    .update(connectionProfiles)
    .set({
      tabsJson: JSON.stringify(workspace.tabs),
      activeTabId: workspace.activeTabId
    })
    .where(eq(connectionProfiles.id, workspace.connectionId))
    .run()
}

export const deleteWorkspace = async (connectionId: string): Promise<void> => {
  getDb()
    .update(connectionProfiles)
    .set({ tabsJson: null, activeTabId: null })
    .where(eq(connectionProfiles.id, connectionId))
    .run()
}

export const loadAllWorkspaces = async (): Promise<WorkspaceStorage> => {
  const rows = getDb().select().from(connectionProfiles).all()
  const result: WorkspaceStorage = {}

  for (const row of rows) {
    if (row.tabsJson) {
      let tabs: unknown[] = []
      try {
        tabs = JSON.parse(row.tabsJson)
      } catch {
        console.warn(`[workspace] Failed to parse tabs for connection ${row.id}`)
      }
      result[row.id] = {
        connectionId: row.id,
        tabs,
        activeTabId: row.activeTabId ?? null
      }
    }
  }

  return result
}
