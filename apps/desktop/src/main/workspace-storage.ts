import type { ConnectionWorkspace, WorkspaceStorage } from '@dbdesk/shared/types'
import { eq } from 'drizzle-orm'
import { getDb, workspaces } from '@dbdesk/db'

const toWorkspace = (row: typeof workspaces.$inferSelect): ConnectionWorkspace => ({
  connectionId: row.connectionId,
  tabs: JSON.parse(row.tabsJson),
  activeTabId: row.activeTabId,
  lastUpdated: new Date(row.lastUpdated),
})

export const loadWorkspace = async (
  connectionId: string,
): Promise<ConnectionWorkspace | undefined> => {
  const row = getDb()
    .select()
    .from(workspaces)
    .where(eq(workspaces.connectionId, connectionId))
    .get()

  return row ? toWorkspace(row) : undefined
}

export const saveWorkspace = async (workspace: ConnectionWorkspace): Promise<void> => {
  getDb()
    .insert(workspaces)
    .values({
      connectionId: workspace.connectionId,
      tabsJson: JSON.stringify(workspace.tabs),
      activeTabId: workspace.activeTabId,
      lastUpdated: workspace.lastUpdated.getTime(),
    })
    .onConflictDoUpdate({
      target: workspaces.connectionId,
      set: {
        tabsJson: JSON.stringify(workspace.tabs),
        activeTabId: workspace.activeTabId,
        lastUpdated: workspace.lastUpdated.getTime(),
      },
    })
    .run()
}

export const deleteWorkspace = async (connectionId: string): Promise<void> => {
  getDb().delete(workspaces).where(eq(workspaces.connectionId, connectionId)).run()
}

export const loadAllWorkspaces = async (): Promise<WorkspaceStorage> => {
  const rows = getDb().select().from(workspaces).all()
  const result: WorkspaceStorage = {}

  for (const row of rows) {
    result[row.connectionId] = toWorkspace(row)
  }

  return result
}
