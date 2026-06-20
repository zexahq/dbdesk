import { useHotkeys } from '@tanstack/react-hotkeys'
import { useSqlWorkspaceStore } from '@renderer/features/sql-workspace/stores/sql-workspace-store'

export function SidebarFocusShortcuts() {
  const setSidebarViewMode = useSqlWorkspaceStore((s) => s.setSidebarViewMode)

  useHotkeys([
    { hotkey: 'Mod+Shift+E', callback: () => setSidebarViewMode('schemas') },
    { hotkey: 'Mod+Shift+D', callback: () => setSidebarViewMode('dashboards') },
    { hotkey: 'Mod+Shift+Y', callback: () => setSidebarViewMode('queries') }
  ])

  return null
}
