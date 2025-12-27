import type { ExportTableResult, SQLConnectionProfile } from '@common/types'
import { dbdeskClient } from '@renderer/api/client'
import { SaveQueryDialog } from '@renderer/components/dialogs/save-query-dialog'
import { TableOptionsDropdown } from '@renderer/components/sql/table-view/table-options-dropdown'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@renderer/components/ui/collapsible'
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
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarSeparator
} from '@renderer/components/ui/sidebar'
import { cn } from '@renderer/lib/utils'
import { useSavedQueriesStore } from '@renderer/store/saved-queries-store'
import { useSqlWorkspaceStore } from '@renderer/store/sql-workspace-store'
import { Tab, useTabStore } from '@renderer/store/tab-store'
import {
  ChevronRight,
  DatabaseIcon,
  FileText,
  MoreVertical,
  Pencil,
  Plus,
  SquareCode,
  Table2Icon,
  Trash2
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from '@renderer/lib/toast'
import { Button } from '../ui/button'
import { useQueryClient } from '@tanstack/react-query'

type WorkspaceSidebarProps = {
  profile: SQLConnectionProfile
}

type RenameMode = {
  open: boolean
  queryId: string | null
}

/**
 * Converts base64 content to a blob and triggers a download
 */
function downloadExportedFile(result: ExportTableResult): void {
  // Convert base64 to blob and download
  const binaryContent = atob(result.base64Content)
  const bytes = new Uint8Array(binaryContent.length)
  for (let i = 0; i < binaryContent.length; i++) {
    bytes[i] = binaryContent.charCodeAt(i)
  }
  const blob = new Blob([bytes], { type: result.mimeType })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = result.filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function WorkspaceSidebar({ profile }: WorkspaceSidebarProps) {
  const [renameMode, setRenameMode] = useState<RenameMode>({ open: false, queryId: null })
  const [exportingTable, setExportingTable] = useState<{ schema: string; table: string; type: 'csv' | 'sql' } | null>(null)

  const { schemasWithTables } = useSqlWorkspaceStore()
  const {
    addTableTab,
    addQueryTab,
    setActiveTab,
    findQueryTabById,
    updateQueryTab,
    getActiveTab,
    removeTab
  } = useTabStore()

  const activeTab = getActiveTab()
  const queryClient = useQueryClient()

  const { queries, loadQueries, deleteQuery, updateQuery } = useSavedQueriesStore()

  useEffect(() => {
    loadQueries(profile.id).catch((error) => {
      console.error('Failed to load queries:', error)
    })
  }, [profile.id, loadQueries])

  const handleTableClick = (schema: string, table: string) => {
    addTableTab(schema, table)
  }

  const handleLoadQuery = (query: (typeof queries)[0]) => {
    const existingTab = findQueryTabById(query.id)
    if (existingTab) {
      setActiveTab(existingTab.id)
      return
    }

    const newTabId = addQueryTab()
    updateQueryTab(newTabId, {
      id: query.id,
      name: query.name,
      editorContent: query.content,
      lastSavedContent: query.content
    })
    setActiveTab(query.id)
  }

  const handleDeleteQuery = async (queryId: string) => {
    try {
      await deleteQuery(profile.id, queryId)
      // Close the tab if that query is open
      const tab = findQueryTabById(queryId)
      if (tab) {
        removeTab(tab.id)
      }

      toast.success('Query deleted')
    } catch {
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

      const tab = findQueryTabById(renameMode.queryId)
      if (tab) {
        updateQueryTab(tab.id, { name: newName })
      }
    } catch {
      toast.error('Failed to rename query')
    }
  }

  const selectedQuery = renameMode.queryId ? queries.find((q) => q.id === renameMode.queryId) : null

  const handleNewQuery = () => {
    addQueryTab()
  }

  const handleDuplicateToQuery = (schema: string, table: string) => {
    const newTabId = addQueryTab()
    updateQueryTab(newTabId, {
      editorContent: `SELECT * FROM "${schema}"."${table}" LIMIT 50`,
      name: `${table} copy`
    })
  }

  const handleExportCSV = async (schema: string, table: string) => {
    setExportingTable({ schema, table, type: 'csv' })
    const toastId = toast.loading(`Exporting ${schema}.${table} as CSV...`)
    try {
      const result = await dbdeskClient.exportTableAsCSV(profile.id, schema, table)
      downloadExportedFile(result)
      toast.success(`Successfully exported ${result.filename}`, { id: toastId })
    } catch (error) {
      console.error('CSV export failed:', error)
      toast.error('Failed to export CSV', { id: toastId })
    } finally {
      setExportingTable(null)
    }
  }

  const handleExportSQL = async (schema: string, table: string) => {
    setExportingTable({ schema, table, type: 'sql' })
    const toastId = toast.loading(`Exporting ${schema}.${table} as SQL...`)
    try {
      const result = await dbdeskClient.exportTableAsSQL(profile.id, schema, table)
      downloadExportedFile(result)
      toast.success(`Successfully exported ${result.filename}`, { id: toastId })
    } catch (error) {
      console.error('SQL export failed:', error)
      toast.error('Failed to export SQL', { id: toastId })
    } finally {
      setExportingTable(null)
    }
  }

  const handleDeleteTable = async (schema: string, table: string) => {
    try {
      await dbdeskClient.deleteTable(profile.id, schema, table)

      // Close any open tabs for this table
      const tableTabId = `${schema}.${table}`
      const tab = findQueryTabById(tableTabId)
      if (tab) {
        removeTab(tab.id)
      }

      toast.success(`Table ${schema}.${table} deleted successfully`)

      // Refresh the schemas and tables by invalidating the query
      queryClient.invalidateQueries({ queryKey: ['schemasWithTables', profile.id] })
    } catch (error) {
      console.error("Table delete failed: ", error)
      toast.error('Failed to delete table')
    }
  }

  return (
    <>
      <Sidebar className="w-full h-full" collapsible="none">
        <SidebarHeader>
          <SidebarGroup className="flex flex-col gap-2">
            <div className="text-sm font-medium text-foreground px-2">{profile.name}</div>
            <Button
              variant="outline"
              className="w-full justify-start h-10 gap-2 cursor-pointer"
              onClick={handleNewQuery}
            >
              <Plus className="size-4 text-muted-foreground" />
              New Query
            </Button>
          </SidebarGroup>
        </SidebarHeader>
        <SidebarSeparator />
        <SidebarContent className="gap-0 py-2">
          <Collapsible defaultOpen className="group/schema">
            <SidebarGroup className="gap-2 py-0">
              <CollapsibleTrigger className="cursor-pointer w-full h-10 px-3 flex items-center justify-between text-sm font-medium border rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                <span className="flex items-center gap-2">
                  <DatabaseIcon className="size-4" />
                  Schemas
                </span>
                <ChevronRight className="size-4 transition-transform group-data-[state=open]/schema:rotate-90" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent className="mt-2">
                  <SidebarMenu>
                    {schemasWithTables.length === 0 ? (
                      <SidebarMenuItem>
                        <SidebarMenuButton aria-disabled>No schemas</SidebarMenuButton>
                      </SidebarMenuItem>
                    ) : (
                      schemasWithTables.map((schemaData) => (
                        <SchemaTree
                          key={schemaData.schema}
                          schema={schemaData.schema}
                          tables={schemaData.tables}
                          activeTab={activeTab}
                          exportingTable={exportingTable}
                          onTableClick={handleTableClick}
                          onDuplicateToQuery={handleDuplicateToQuery}
                          onExportCSV={handleExportCSV}
                          onExportSQL={handleExportSQL}
                          onDelete={handleDeleteTable}
                        />
                      ))
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>

          <Collapsible className="group/queries">
            <SidebarGroup className="gap-2">
              <CollapsibleTrigger className="cursor-pointer w-full h-10 px-3 flex items-center justify-between text-sm font-medium border rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                <span className="flex items-center gap-2">
                  <FileText className="size-4" />
                  Saved Queries
                </span>
                <ChevronRight className="size-4 transition-transform group-data-[state=open]/queries:rotate-90" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent className="mt-2">
                  {queries.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground text-center">
                      No saved queries yet
                      <div className="text-xs mt-2">Press Ctrl+S to save a query</div>
                    </div>
                  ) : (
                    <SidebarMenu>
                      {queries.map((query) => {
                        const isActive = activeTab?.id === query.id
                        return (
                          <SidebarMenuItem key={query.id}>
                            <div
                              className={cn(
                                'flex items-center justify-between w-full px-2 rounded-md hover:bg-accent group',
                                isActive && 'bg-accent'
                              )}
                            >
                              <SidebarMenuButton
                                onClick={() => handleLoadQuery(query)}
                                className="flex-1 cursor-pointer gap-2 h-9"
                                asChild
                              >
                                <button className="text-left">
                                  <SquareCode className="size-4 shrink-0" />
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
                                    className="cursor-pointer"
                                  >
                                    <Trash2 className="size-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </SidebarMenuItem>
                        )
                      })}
                    </SidebarMenu>
                  )}
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
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

type SchemaTreeProps = {
  schema: string
  tables: string[]
  activeTab: Tab | undefined
  exportingTable: { schema: string; table: string; type: 'csv' | 'sql' } | null
  onTableClick: (schema: string, table: string) => void
  onDuplicateToQuery: (schema: string, table: string) => void
  onExportCSV: (schema: string, table: string) => void
  onExportSQL: (schema: string, table: string) => void
  onDelete: (schema: string, table: string) => void
}

function SchemaTree({
  schema,
  tables,
  activeTab,
  exportingTable,
  onTableClick,
  onExportCSV,
  onExportSQL,
  onDelete
}: SchemaTreeProps) {
  const isPublic = schema === 'public'

  return (
    <SidebarMenuItem>
      <Collapsible
        className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
        defaultOpen={isPublic}
      >
        <CollapsibleTrigger asChild>
          <SidebarMenuButton className="cursor-pointer h-9">
            <ChevronRight className="size-4 transition-transform" />
            <DatabaseIcon className="size-4" />
            <span>{schema}</span>
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="ml-3! mr-0!">
            {tables.length === 0 ? (
              <SidebarMenuButton aria-disabled>No tables</SidebarMenuButton>
            ) : (
              tables.map((table) => {
                const isActive = activeTab?.id === `${schema}.${table}`
                return (
                  <div
                    key={table}
                    className={cn(
                      'flex items-center justify-between w-full px-2 rounded-md hover:bg-accent group',
                      isActive && 'bg-accent'
                    )}
                  >
                    <SidebarMenuButton
                      onClick={() => onTableClick(schema, table)}
                      className="flex-1 cursor-pointer gap-2 h-9"
                      isActive={isActive}
                    >
                      <Table2Icon className="size-4" />
                      <span>{table}</span>
                    </SidebarMenuButton>
                    <div className={`${isActive ? 'block!' : 'hidden'}`}>
                      <TableOptionsDropdown
                        onExportCSV={() => onExportCSV(schema, table)}
                        onExportSQL={() => onExportSQL(schema, table)}
                        onDelete={() => onDelete(schema, table)}
                        disabled={exportingTable?.schema === schema && exportingTable?.table === table}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  )
}
