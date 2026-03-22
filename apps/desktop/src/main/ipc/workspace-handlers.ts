import { loadWorkspace, saveWorkspace, deleteWorkspace } from '../workspace-storage'
import { typedHandle } from './typed-handle'

export function registerWorkspaceHandlers() {
  typedHandle('workspace:load', async ({ connectionId }) => loadWorkspace(connectionId))

  typedHandle('workspace:save', async ({ workspace }) => saveWorkspace(workspace))

  typedHandle('workspace:delete', async ({ connectionId }) => deleteWorkspace(connectionId))
}
