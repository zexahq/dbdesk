import type { SQLConnectionProfile } from '@common/types'
import { SaveQueryDialog } from '@renderer/components/dialogs/save-query-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@renderer/components/ui/sidebar'
import { useQueryTabStore } from '@renderer/store/query-tab-store'
import { useSavedQueriesStore } from '@renderer/store/saved-queries-store'
import { useSqlWorkspaceStore } from '@renderer/store/sql-workspace-store'
import { ArrowLeft, FileText, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '../../ui/button'

type QuerySidebarProps = {
  profile: SQLConnectionProfile
}

type RenameMode = {
  open: boolean
  queryId: string | null
}

export function QuerySidebar({ profile }: QuerySidebarProps) {
  const { setView } = useSqlWorkspaceStore()
  const { queries, loadQueries, deleteQuery, updateQuery } = useSavedQueriesStore()
  const { addTab, setActiveTab, findTabBySavedQueryId, updateTab } = useQueryTabStore()
  const [renameMode, setRenameMode] = useState<RenameMode>({ open: false, queryId: null })

  useEffect(() => {
    loadQueries(profile.id).catch((error) => {
      console.error('Failed to load queries:', error)
    })
  }, [profile.id, loadQueries])

  const handleLoadQuery = (query: (typeof queries)[0]) => {
    // Check if a tab with this saved query already exists
    const existingTab = findTabBySavedQueryId(query.id)
    if (existingTab) {
      setActiveTab(existingTab.id)
      return
    }

    // Create new tab with the saved query ID
    const newTabId = addTab(query.id)
    // The tab will be added and activated, then we can update it with the saved query
    setTimeout(() => {
      updateTab(newTabId, {
        name: query.name,
        editorContent: query.content
      })
    }, 0)
  }

  const handleDeleteQuery = async (queryId: string) => {
    try {
      await deleteQuery(profile.id, queryId)
      toast.success('Query deleted')
    } catch (error) {
      toast.error('Failed to delete query')
    }
  }

  const handleRenameQuery = async (newName: string) => {
    if (!renameMode.queryId) return

    const query = queries.find((q) => q.id === renameMode.queryId)
    if (!query) return

    try {
      await updateQuery(profile.id, renameMode.queryId, newName, query.content)
      toast.success('Query renamed')

      // Update any open tabs with this query
      const tab = findTabBySavedQueryId(renameMode.queryId)
      if (tab) {
        updateTab(tab.id, { name: newName })
      }
    } catch (error) {
      toast.error('Failed to rename query')
    }
  }

  const selectedQuery = renameMode.queryId ? queries.find((q) => q.id === renameMode.queryId) : null

  return (
    <>
      <Sidebar className="border-r w-full h-full" collapsible="none">
        <SidebarHeader>
          <SidebarGroupLabel>{profile.name}</SidebarGroupLabel>
          <SidebarGroup className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-2 cursor-pointer"
              onClick={() => setView('table')}
            >
              <ArrowLeft className="size-4" />
              Back to Tables
            </Button>
          </SidebarGroup>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Saved Queries</SidebarGroupLabel>
            <SidebarGroupContent>
              {queries.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  No saved queries yet
                  <div className="text-xs mt-2">Press Ctrl+S to save a query</div>
                </div>
              ) : (
                <SidebarMenu>
                  {queries.map((query) => (
                    <SidebarMenuItem key={query.id}>
                      <div className="flex items-center justify-between w-full px-2 rounded-md hover:bg-accent group">
                        <SidebarMenuButton
                          onClick={() => handleLoadQuery(query)}
                          className="flex-1 cursor-pointer gap-2"
                          asChild
                        >
                          <button className="text-left">
                            <FileText className="size-4 flex-shrink-0" />
                            <span className="truncate">{query.name}</span>
                          </button>
                        </SidebarMenuButton>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent rounded cursor-pointer">
                              <MoreVertical className="size-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setRenameMode({ open: true, queryId: query.id })
                              }}
                              className="cursor-pointer"
                            >
                              <Pencil className="size-4 mr-2" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteQuery(query.id)}
                              className="cursor-pointer text-destructive"
                            >
                              <Trash2 className="size-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      {selectedQuery && (
        <SaveQueryDialog
          open={renameMode.open}
          onOpenChange={(open) => setRenameMode({ ...renameMode, open })}
          title="Rename Query"
          description="Enter a new name for your query"
          placeholder={selectedQuery.name}
          submitText="Rename"
          initialValue={selectedQuery.name}
          onSave={handleRenameQuery}
        />
      )}
    </>
  )
}
