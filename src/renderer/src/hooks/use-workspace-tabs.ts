import { useMemo } from 'react'
import type { Tab } from '@renderer/store/tab-store'
import { useTabStore } from '@renderer/store/tab-store'
import { toast } from '@renderer/lib/toast'

export function useWorkspaceTabs() {
  const tabs = useTabStore((s) => s.tabs)
  const activeTabId = useTabStore((s) => s.activeTabId)
  const setActiveTab = useTabStore((s) => s.setActiveTab)
  const addQueryTab = useTabStore((s) => s.addQueryTab)
  const moveTab = useTabStore((s) => s.moveTab)
  const reset = useTabStore((s) => s.reset)

  // Type guard for query tabs
  const isQueryTab = (tab: Tab): tab is Tab & { kind: 'query' } =>
    tab.kind === 'query'

  const isQueryTabDirty = useTabStore((s) => s.isQueryTabDirty)

  // Memoized tab calculations to prevent unnecessary re-renders
  const tabCalculations = useMemo(() =>
    tabs.map(tab => ({
      tab,
      isActive: activeTabId === tab.id,
      isDirty: isQueryTab(tab) ? isQueryTabDirty(tab) : false
    })), [tabs, activeTabId, isQueryTabDirty])

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId)
  }

  const handleAddQueryTab = () => {
    addQueryTab()
  }

  const handleMoveTab = (fromIndex: number, toIndex: number) => {
    try {
      moveTab(fromIndex, toIndex)
    } catch (error) {
      console.error('Error during tab reordering:', error)
      toast.error('Failed to reorder tabs')
    }
  }

  return {
    tabs,
    activeTabId,
    tabCalculations,
    handleTabClick,
    handleAddQueryTab,
    handleMoveTab,
    reset,
    isQueryTab
  }
}
