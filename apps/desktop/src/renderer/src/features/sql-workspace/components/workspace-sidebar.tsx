import type { DashboardConfig, SQLConnectionProfile } from '@dbdesk/shared/types'
import { SaveQueryDialog } from '@renderer/components/dialogs/save-query-dialog'
import { AddTableSheet } from '@renderer/features/sql-workspace/components/sheets/add-table-sheet'
import { TableOptionsDropdown } from '@renderer/features/sql-workspace/components/table-view/table-options-dropdown'
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
import { toast } from '@renderer/shared/lib/toast'
import { cn } from '@renderer/shared/lib/utils'
import { useSavedQueriesStore } from '@renderer/features/sql-workspace/stores/saved-queries-store'
import { useSqlWorkspaceStore } from '@renderer/features/sql-workspace/stores/sql-workspace-store'
import { Tab, useActiveTab, useTabStore } from '@renderer/features/sql-workspace/stores/tab-store'
import {
  ChevronRight,
  DatabaseIcon,
  LayoutDashboard,
  MoreVertical,
  Pencil,
  Plus,
  RotateCw,
  SquareCode,
  Table2Icon,
  Trash2
} from 'lucide-react'
import { dbdeskClient } from '@renderer/shared/api/client'
import { queryClient } from '@renderer/shared/lib/query-client'
import { useQuery } from '@tanstack/react-query'
import {
  DASHBOARD_QUERY_KEYS,
  useDashboardStore
} from '@renderer/features/sql-workspace/stores/dashboard-store'
import { useEffect, useState } from 'react'
import { Button } from '@renderer/components/ui/button'

type WorkspaceSidebarProps = {
  profile: SQLConnectionProfile
}

type RenameMode = {
  open: boolean
  queryId: string | null
}

type DashboardRenameMode = {
  open: boolean
  dashboardId: string | null
}

export function WorkspaceSidebar({ profile }: WorkspaceSidebarProps) {
  const [renameMode, setRenameMode] = useState<RenameMode>({ open: false, queryId: null })
  const [dashboardRenameMode, setDashboardRenameMode] = useState<DashboardRenameMode>({ open: false, dashboardId: null })

  const sidebarViewMode = useSqlWorkspaceStore((s) => s.sidebarViewMode)
  const schemasWithTables = useSqlWorkspaceStore((s) => s.schemasWithTables)
  const addTableTab = useTabStore((s) => s.addTableTab)
  const addQueryTab = useTabStore((s) => s.addQueryTab)
  const setActiveTab = useTabStore((s) => s.setActiveTab)
  const findQueryTabById = useTabStore((s) => s.findQueryTabById)
  const updateQueryTab = useTabStore((s) => s.updateQueryTab)
  const removeTab = useTabStore((s) => s.removeTab)
  const activeTab = useActiveTab()
  const addDashboardTab = useTabStore((s) => s.addDashboardTab)
  const findDashboardTabById = useTabStore((s) => s.findDashboardTabById)

  const queries = useSavedQueriesStore((s) => s.queries)
  const loadQueries = useSavedQueriesStore((s) => s.loadQueries)
  const deleteQuery = useSavedQueriesStore((s) => s.deleteQuery)
  const updateQuery = useSavedQueriesStore((s) => s.updateQuery)

  const dashboardStore = useDashboardStore()
  const { data: dashboards = [] } = useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.list(profile.id),
    queryFn: () => dbdeskClient.loadDashboards(profile.id),
    staleTime: 30_000,
    refetchOnWindowFocus: false
  })

  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefreshSchemas = async () => {
    setIsRefreshing(true)
    try {
      await queryClient.invalidateQueries({
        queryKey: ['schemasWithTables', profile.id]
      })
      toast.success('Schemas refreshed')
    } catch {
      toast.error('Failed to refresh schemas')
    } finally {
      setIsRefreshing(false)
    }
  }

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

  const handleCreateDashboard = async () => {
    try {
      const newDashboard = await dashboardStore.createDashboard(
        profile.id,
        `Dashboard ${dashboards.length + 1}`
      )
      await queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEYS.list(profile.id) })
      addDashboardTab(newDashboard.dashboardId, newDashboard.name)
      dashboardStore.setCurrentDashboard(newDashboard)
      toast.success('Dashboard created')
    } catch {
      toast.error('Failed to create dashboard')
    }
  }

  const handleLoadDashboard = (dashboard: DashboardConfig) => {
    const existingTab = findDashboardTabById(dashboard.dashboardId)
    if (existingTab) {
      setActiveTab(existingTab.id)
      return
    }

    addDashboardTab(dashboard.dashboardId, dashboard.name)
    dashboardStore.setCurrentDashboard(dashboard)
  }

  const handleDeleteDashboard = async (dashboardId: string) => {
    try {
      await dashboardStore.deleteDashboard(profile.id, dashboardId)
      await queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEYS.list(profile.id) })

      const tab = findDashboardTabById(dashboardId)
      if (tab) {
        removeTab(tab.id)
      }

      if (dashboardStore.currentDashboard?.dashboardId === dashboardId) {
        dashboardStore.setCurrentDashboard(null)
      }

      toast.success('Dashboard deleted')
    } catch {
      toast.error('Failed to delete dashboard')
    }
  }

  const handleRenameDashboard = async (newName: string) => {
    if (!dashboardRenameMode.dashboardId) return

    try {
      const dashboard = await dbdeskClient.getDashboard(profile.id, dashboardRenameMode.dashboardId)
      if (!dashboard) {
        toast.error('Dashboard not found')
        return
      }

      const updatedDashboard: DashboardConfig = {
        ...dashboard,
        name: newName,
        updatedAt: new Date()
      }
      await dashboardStore.saveDashboard(updatedDashboard)
      await queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEYS.list(profile.id) })

      const tab = findDashboardTabById(dashboardRenameMode.dashboardId)
      if (tab) {
        useTabStore.getState().tabs.forEach((t) => {
          if (t.kind === 'dashboard' && t.dashboardId === dashboardRenameMode.dashboardId) {
            removeTab(t.id)
          }
        })
        addDashboardTab(dashboardRenameMode.dashboardId, newName)
      }

      if (dashboardStore.currentDashboard?.dashboardId === dashboardRenameMode.dashboardId) {
        dashboardStore.setCurrentDashboard(updatedDashboard)
      }

      toast.success('Dashboard renamed')
    } catch {
      toast.error('Failed to rename dashboard')
    }
  }

  const selectedQuery = renameMode.queryId ? queries.find((q) => q.id === renameMode.queryId) : null
  const selectedDashboard = dashboardRenameMode.dashboardId
    ? dashboards.find((d) => d.dashboardId === dashboardRenameMode.dashboardId)
    : null

  const renderActionButton = () => {
    switch (sidebarViewMode) {
      case 'schemas':
        return (
          <Button
            variant="outline"
            className="w-full justify-start h-10 gap-2 cursor-pointer"
            onClick={handleRefreshSchemas}
            disabled={isRefreshing}
          >
            <RotateCw className={cn('size-4 text-muted-foreground', isRefreshing && 'animate-spin')} />
            Refresh Schemas
          </Button>
        )
      case 'queries':
        return (
          <Button
            variant="outline"
            className="w-full justify-start h-10 gap-2 cursor-pointer"
            onClick={handleNewQuery}
          >
            <Plus className="size-4 text-muted-foreground" />
            New Query
          </Button>
        )
      case 'dashboards':
        return (
          <Button
            variant="outline"
            className="w-full justify-start h-10 gap-2 cursor-pointer"
            onClick={handleCreateDashboard}
          >
            <LayoutDashboard className="size-4 text-muted-foreground" />
            New Dashboard
          </Button>
        )
    }
  }

  const renderContent = () => {
    switch (sidebarViewMode) {
      case 'schemas':
        return (
          <SidebarGroupContent>
            <SidebarMenu>
              {schemasWithTables.length === 0 ? (
                <SidebarMenuItem>
                  <SidebarMenuButton aria-disabled>No schemas</SidebarMenuButton>
                </SidebarMenuItem>
              ) : (
                schemasWithTables.map((schemaData) => (
                  <SchemaTree
                    key={schemaData.schema}
                    connectionId={profile.id}
                    schema={schemaData.schema}
                    tables={schemaData.tables}
                    activeTab={activeTab}
                    onTableClick={handleTableClick}
                    onDuplicateToQuery={handleDuplicateToQuery}
                    profile={profile}
                  />
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        )
      case 'queries':
        return (
          <SidebarGroupContent>
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
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 hover:bg-accent/80"
                            >
                              <MoreVertical className="size-4" />
                            </Button>
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
        )
      case 'dashboards':
        return (
          <SidebarGroupContent>
            {dashboards.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                No dashboards yet
              </div>
            ) : (
              <SidebarMenu>
                {dashboards.map((dashboard) => {
                  const isActive = activeTab?.kind === 'dashboard' && activeTab.dashboardId === dashboard.dashboardId
                  return (
                    <SidebarMenuItem key={dashboard.dashboardId}>
                      <div
                        className={cn(
                          'flex items-center justify-between w-full px-2 rounded-md hover:bg-accent group',
                          isActive && 'bg-accent'
                        )}
                      >
                        <SidebarMenuButton
                          onClick={() => handleLoadDashboard(dashboard)}
                          className="flex-1 cursor-pointer gap-2 h-9"
                          asChild
                        >
                          <button className="text-left">
                            <LayoutDashboard className="size-4 shrink-0" />
                            <span className="truncate">{dashboard.name}</span>
                          </button>
                        </SidebarMenuButton>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 hover:bg-accent/80"
                            >
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setDashboardRenameMode({ open: true, dashboardId: dashboard.dashboardId })
                              }}
                              className="cursor-pointer"
                            >
                              <Pencil className="size-4 mr-2" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteDashboard(dashboard.dashboardId)}
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
        )
    }
  }

  return (
    <>
      <Sidebar className="w-full h-full" collapsible="none">
        <SidebarHeader>
          <SidebarGroup className="flex flex-col gap-2">
            <div className="text-sm font-medium text-foreground px-2">{profile.name}</div>
            {renderActionButton()}
          </SidebarGroup>
        </SidebarHeader>
        <SidebarSeparator />
        <SidebarContent className="gap-0 py-2">
          <SidebarGroup className="gap-2 py-0">
            {renderContent()}
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
      {selectedDashboard && (
        <SaveQueryDialog
          open={dashboardRenameMode.open}
          onOpenChange={(open) => setDashboardRenameMode({ ...dashboardRenameMode, open })}
          title="Rename Dashboard"
          description="Enter a new name for your dashboard"
          placeholder={selectedDashboard.name}
          submitText="Rename"
          initialValue={selectedDashboard.name}
          onSave={handleRenameDashboard}
        />
      )}
    </>
  )
}

type SchemaTreeProps = {
  connectionId: string
  schema: string
  tables: string[]
  activeTab: Tab | null
  onTableClick: (schema: string, table: string) => void
  onDuplicateToQuery: (schema: string, table: string) => void
  profile: SQLConnectionProfile
}

function SchemaTree({
  connectionId,
  schema,
  tables,
  activeTab,
  onTableClick,
  profile
}: SchemaTreeProps) {
  const isPublic = schema === 'public'
  const [createTableDrawerOpen, setCreateTableDrawerOpen] = useState(false)

  return (
    <>
      <SidebarMenuItem>
        <Collapsible
          className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
          defaultOpen={isPublic}
        >
          <div className="flex items-center gap-1">
            <CollapsibleTrigger asChild>
              <SidebarMenuButton className="cursor-pointer h-9 flex-1">
                <ChevronRight className="size-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                <DatabaseIcon className="size-4" />
                <span>{schema}</span>
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-50 hover:opacity-100 transition-all h-8 w-8 cursor-pointer"
              onClick={() => setCreateTableDrawerOpen(true)}
              title="Create new table"
            >
              <Plus className="size-4" />
            </Button>
          </div>
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
                          connectionId={connectionId}
                          schema={schema}
                          table={table}
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

      <AddTableSheet
        open={createTableDrawerOpen}
        onOpenChange={setCreateTableDrawerOpen}
        connectionId={connectionId}
        schema={schema}
        databaseType={profile.type}
      />
    </>
  )
}
