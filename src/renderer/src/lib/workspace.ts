import type { ConnectionWorkspace } from '@common/types'
import { dbdeskClient } from '@renderer/api/client'
import { useSqlWorkspaceStore } from '@renderer/store/sql-workspace-store'
import { useTabStore } from '@renderer/store/tab-store'

export async function saveCurrentWorkspace() {
  const currentConnectionId = useSqlWorkspaceStore.getState().currentConnectionId
  const tabState = useTabStore.getState().serializeState()

  if (!currentConnectionId) return

  try {
    const workspace: ConnectionWorkspace = {
      connectionId: currentConnectionId,
      lastUpdated: new Date(),
      tabs: tabState.tabs,
      activeTabId: tabState.activeTabId
    }

    await dbdeskClient.saveWorkspace(workspace)
    console.debug('Workspace saved for connection:', currentConnectionId)
  } catch (error) {
    console.warn('Failed to save workspace:', error)
  }
}

export const registerWorkspaceFlushListener = () => {
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
