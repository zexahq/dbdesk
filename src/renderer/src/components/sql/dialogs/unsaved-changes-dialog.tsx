import type { SQLConnectionProfile } from '@common/types'
import { SaveQueryDialog } from '@renderer/components/dialogs/save-query-dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@renderer/components/ui/alert-dialog'
import { useSavedQueriesStore } from '@renderer/store/saved-queries-store'
import type { QueryTab } from '@renderer/store/tab-store'
import { useTabStore } from '@renderer/store/tab-store'
import { useState } from 'react'
import { toast } from '@renderer/lib/toast'

interface UnsavedChangesDialogProps {
  open: boolean
  tab: QueryTab | null
  profile: SQLConnectionProfile
  onOpenChange: (open: boolean) => void
  onClose: () => void
}

export function UnsavedChangesDialog({
  open,
  tab,
  profile,
  onOpenChange,
  onClose
}: UnsavedChangesDialogProps) {
  const { queries, saveQuery, updateQuery } = useSavedQueriesStore()
  const { removeTab, updateQueryTab } = useTabStore()
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)

  const handleCloseWithoutSave = () => {
    if (tab) {
      removeTab(tab.id)
    }
    onClose()
    onOpenChange(false)
  }

  const handleSaveAndClose = async () => {
    if (!tab) return

    const isQueryTabSaved = queries.some((q) => q.id === tab.id)

    if (isQueryTabSaved) {
      // Update existing query
      const savedQuery = queries.find((q) => q.id === tab.id)
      if (!savedQuery) {
        onOpenChange(false)
        onClose()
        return
      }

      try {
        await updateQuery(profile.id, tab.id, savedQuery.name, tab.editorContent)
        updateQueryTab(tab.id, { lastSavedContent: tab.editorContent })
        removeTab(tab.id)
        onClose()
        onOpenChange(false)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to save query')
      }
    } else {
      // Show save dialog for new query
      onOpenChange(false)
      setSaveDialogOpen(true)
    }
  }

  const handleSaveQuery = async (name: string) => {
    if (!tab) return

    try {
      await saveQuery(profile.id, tab.id, name, tab.editorContent)
      updateQueryTab(tab.id, { name, lastSavedContent: tab.editorContent })
      removeTab(tab.id)
      onClose()
      setSaveDialogOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save query')
    }
  }

  const handleDialogOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen)
    if (!isOpen) {
      onClose()
    }
  }

  const handleSaveDialogOpenChange = (isOpen: boolean) => {
    setSaveDialogOpen(isOpen)
    if (!isOpen) {
      onClose()
    }
  }

  return (
    <>
      <AlertDialog open={open} onOpenChange={handleDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Do you want to save the changes you made to {tab?.name || 'Untitled Query'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Your changes will be lost if you don&apos;t save them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCloseWithoutSave}
              className="bg-muted text-foreground hover:bg-muted/80"
            >
              Don&apos;t Save
            </AlertDialogAction>
            <AlertDialogAction onClick={() => void handleSaveAndClose()}>Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SaveQueryDialog
        open={saveDialogOpen}
        onOpenChange={handleSaveDialogOpenChange}
        onSave={handleSaveQuery}
      />
    </>
  )
}
