'use client'

import type { SQLConnectionProfile } from '@common/types'
import type { Tab } from '@renderer/store/tab-store'
import { useActiveTab, useTabStore } from '@renderer/store/tab-store'
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
  const activeTab = useActiveTab()

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

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // Prevent default browser behavior for Ctrl+Tab and Ctrl+Shift+Tab
      if ((event.ctrlKey || event.metaKey) && event.key === 'Tab') {
        event.preventDefault()

        if (tabs.length === 0) return

        const currentIndex = activeTabId ? tabs.findIndex((tab) => tab.id === activeTabId) : -1

        if (event.shiftKey) {
          // Ctrl+Shift+Tab: Previous tab
          const prevIndex = currentIndex <= 0 ? tabs.length - 1 : currentIndex - 1
          handleTabClick(tabs[prevIndex].id)
        } else {
          // Ctrl+Tab: Next tab
          const nextIndex = currentIndex >= tabs.length - 1 ? 0 : currentIndex + 1
          handleTabClick(tabs[nextIndex].id)
        }
        return
      }

      // Ctrl+W or Ctrl+F4: Close active tab
      if (
        (event.ctrlKey || event.metaKey) &&
        (event.key === 'w' || event.key === 'W' || event.key === 'F4')
      ) {
        event.preventDefault()
        if (activeTab) {
          requestCloseTab(activeTab)
        }
        return
      }

      // Ctrl+1-9: Switch to tab by number
      if ((event.ctrlKey || event.metaKey) && /^[1-9]$/.test(event.key)) {
        const tabIndex = parseInt(event.key, 10) - 1
        if (tabIndex < tabs.length) {
          event.preventDefault()
          handleTabClick(tabs[tabIndex].id)
        }
        return
      }

      // Ctrl+T: New tab
      if ((event.ctrlKey || event.metaKey) && event.key === 't') {
        event.preventDefault()
        if (onAddQueryTab) {
          onAddQueryTab()
        }
        return
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [tabs, activeTabId, activeTab, handleTabClick, requestCloseTab, onAddQueryTab])

  return null
}
