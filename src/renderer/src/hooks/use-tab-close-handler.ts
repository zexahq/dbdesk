import type { SQLConnectionProfile } from '@common/types'
import type { QueryTab, Tab } from '@renderer/store/tab-store'
import { useTabStore } from '@renderer/store/tab-store'
import { useState } from 'react'

interface UseTabCloseHandlerReturn {
  requestCloseTab: (tab: Tab) => void
  dialogProps: {
    open: boolean
    tab: QueryTab | null
    profile: SQLConnectionProfile
    onOpenChange: (open: boolean) => void
    onClose: () => void
  }
}

export function useTabCloseHandler(profile: SQLConnectionProfile): UseTabCloseHandlerReturn {
  const { isQueryTabDirty, removeTab } = useTabStore()
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)
  const [tabToClose, setTabToClose] = useState<QueryTab | null>(null)

  const requestCloseTab = (tab: Tab) => {
    // Only show dialog for dirty query tabs
    if (tab.kind === 'query' && isQueryTabDirty(tab)) {
      setTabToClose(tab)
      setCloseDialogOpen(true)
    } else {
      removeTab(tab.id)
    }
  }

  const handleCloseDialogClose = () => {
    setTabToClose(null)
  }

  return {
    requestCloseTab,
    dialogProps: {
      open: closeDialogOpen,
      tab: tabToClose,
      profile,
      onOpenChange: setCloseDialogOpen,
      onClose: handleCloseDialogClose
    }
  }
}
