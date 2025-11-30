'use client'

import { useTabStore } from '@renderer/store/tab-store'
import * as React from 'react'

export const TabNavigation = React.memo(TabNavigationImpl, () => true)

function TabNavigationImpl() {
  const { tabs, activeTabId, removeTab, setActiveTab } = useTabStore()

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
        if (activeTabId) {
          removeTab(activeTabId)
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
  }, [tabs, activeTabId, removeTab, setActiveTab])

  // This component doesn't render anything, it just handles keyboard shortcuts
  return null
}
