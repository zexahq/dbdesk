import type { ConnectionWorkspace } from '@common/types'
import { dbdeskClient } from '@renderer/api/client'
import { useQueryTabStore } from '@renderer/store/query-tab-store'
import { useSqlWorkspaceStore } from '@renderer/store/sql-workspace-store'
import { useTabStore } from '@renderer/store/tab-store'

export async function saveCurrentWorkspace() {
  const currentConnectionId = useSqlWorkspaceStore.getState().currentConnectionId
  const workspaceView = useSqlWorkspaceStore.getState().view
  const tabState = useTabStore.getState().serializeState()
  const queryTabState = useQueryTabStore.getState().serializeState()

  if (!currentConnectionId) return

  try {
    const workspace: ConnectionWorkspace = {
      connectionId: currentConnectionId,
      lastUpdated: new Date(),
      tableTabs: tabState.tabs,
      activeTableTabId: tabState.activeTabId,
      queryTabs: queryTabState.tabs,
      activeQueryTabId: queryTabState.activeTabId,
      workspaceView
    }

    await dbdeskClient.saveWorkspace(workspace)
    console.debug('Workspace saved for connection:', currentConnectionId)
  } catch (error) {
    console.warn('Failed to save workspace:', error)
  }
}

export const registerWorkspaceFlushListener = (): void => {
  const ipcRenderer = window.electron?.ipcRenderer
  if (!ipcRenderer) return

  const channel = 'workspace:flush'
  ipcRenderer.removeAllListeners(channel)

  ipcRenderer.on(channel, () => {
    void (async () => {
      await saveCurrentWorkspace()
      ipcRenderer.send('workspace:flushed')
    })()
  })
}
