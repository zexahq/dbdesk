import { useEffect } from 'react'
import { useSqlWorkspaceStore } from '@renderer/features/sql-workspace/stores/sql-workspace-store'

export function SidebarFocusShortcuts() {
  const setSidebarViewMode = useSqlWorkspaceStore((s) => s.setSidebarViewMode)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const mod = event.metaKey || event.ctrlKey
      if (!mod || !event.shiftKey) return

      event.preventDefault()

      switch (event.code) {
        case 'KeyE':
          setSidebarViewMode('schemas')
          break
        case 'KeyD':
          setSidebarViewMode('dashboards')
          break
        case 'KeyF':
          setSidebarViewMode('queries')
          break
        default:
          return
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setSidebarViewMode])

  return null
}
