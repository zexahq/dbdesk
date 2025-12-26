'use client'

import type { SQLConnectionProfile } from '@common/types'
import type { Tab } from '@renderer/store/tab-store'
import { useTabStore } from '@renderer/store/tab-store'
import * as React from 'react'

interface TabNavigationProps {
  profile: SQLConnectionProfile
  requestCloseTab: (tab: Tab) => void
}

export function TabNavigation({ requestCloseTab }: TabNavigationProps) {
  const tabs = useTabStore((s) => s.tabs)
  const activeTabId = useTabStore((s) => s.activeTabId)
  const getActiveTab = useTabStore((s) => s.getActiveTab)
  const setActiveTab = useTabStore((s) => s.setActiveTab)

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
          setActiveTab(tabs[prevIndex].id)
        } else {
          // Ctrl+Tab: Next tab
          const nextIndex = currentIndex >= tabs.length - 1 ? 0 : currentIndex + 1
          setActiveTab(tabs[nextIndex].id)
        }
        return
      }

      // Ctrl+W or Ctrl+F4: Close active tab
      if (
        (event.ctrlKey || event.metaKey) &&
        (event.key === 'w' || event.key === 'W' || event.key === 'F4')
      ) {
        // Don't close if it's the only tab
        if (tabs.length <= 1) return

        event.preventDefault()
        const activeTab = getActiveTab()
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
          setActiveTab(tabs[tabIndex].id)
        }
        return
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [tabs, activeTabId, getActiveTab, setActiveTab, requestCloseTab])

  return null
}
