'use client'

import type { SQLConnectionProfile } from '@dbdesk/shared/types'
import type { Tab } from '@renderer/features/sql-workspace/stores/tab-store'
import { useTabStore } from '@renderer/features/sql-workspace/stores/tab-store'
import { useHotkeys } from '@tanstack/react-hotkeys'
import * as React from 'react'

interface TabNavigationProps {
  profile: SQLConnectionProfile
  requestCloseTab: (tab: Tab) => void
  onTabClick?: (tabId: string) => void
  onAddQueryTab?: () => void
}

export function TabNavigation({ requestCloseTab, onTabClick, onAddQueryTab }: TabNavigationProps) {
  const tabs = useTabStore((s) => s.tabs)
  const activeTabId = useTabStore((s) => s.activeTabId)
  const setActiveTab = useTabStore((s) => s.setActiveTab)

  const handleTabClick = React.useCallback(
    (tabId: string) => {
      if (onTabClick) {
        onTabClick(tabId)
      } else {
        setActiveTab(tabId)
      }
    },
    [onTabClick, setActiveTab]
  )

  useHotkeys([
    {
      hotkey: 'Mod+Tab',
      callback: () => {
        if (tabs.length === 0) return
        const currentIndex = activeTabId ? tabs.findIndex((tab) => tab.id === activeTabId) : -1
        const nextIndex = currentIndex >= tabs.length - 1 ? 0 : currentIndex + 1
        handleTabClick(tabs[nextIndex].id)
      }
    },
    {
      hotkey: 'Mod+Shift+Tab',
      callback: () => {
        if (tabs.length === 0) return
        const currentIndex = activeTabId ? tabs.findIndex((tab) => tab.id === activeTabId) : -1
        const prevIndex = currentIndex <= 0 ? tabs.length - 1 : currentIndex - 1
        handleTabClick(tabs[prevIndex].id)
      }
    },
    {
      hotkey: 'Mod+W',
      callback: () => {
        const tabToClose = tabs.find((t) => t.id === activeTabId)
        if (tabToClose) requestCloseTab(tabToClose)
      }
    },
    ...Array.from({ length: 9 }, (_, index) => ({
      hotkey: { key: String(index + 1), mod: true },
      callback: () => {
        const tab = tabs[index]
        if (tab) handleTabClick(tab.id)
      }
    })),
    {
      hotkey: 'Mod+T',
      callback: () => onAddQueryTab?.()
    }
  ])

  return null
}
