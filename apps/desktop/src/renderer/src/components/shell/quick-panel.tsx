import type { ColumnInfo } from '@dbdesk/shared/types'
import { Button } from '@renderer/components/ui/button'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut
} from '@renderer/components/ui/command'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import {
  useConnect,
  useConnections,
  useDisconnect
} from '@renderer/features/connections/queries/connections'
import {
  useExportTableAsCSV,
  useExportTableAsSQL
} from '@renderer/features/data-table/queries/export'
import { useSettingsStore } from '@renderer/features/settings/stores/settings-store'
import { AddRowSheet } from '@renderer/features/sql-workspace/components/sheets/add-row-sheet'
import { EXECUTE_ACTIVE_QUERY_EVENT } from '@renderer/features/sql-workspace/lib/commands'
import { saveCurrentWorkspace } from '@renderer/features/sql-workspace/lib/workspace'
import {
  useInsertTableRow,
  useTableIntrospection
} from '@renderer/features/sql-workspace/queries/schema'
import { useDashboardStore } from '@renderer/features/sql-workspace/stores/dashboard-store'
import { useSavedQueriesStore } from '@renderer/features/sql-workspace/stores/saved-queries-store'
import { useSqlWorkspaceStore } from '@renderer/features/sql-workspace/stores/sql-workspace-store'
import { useTabStore } from '@renderer/features/sql-workspace/stores/tab-store'
import { dbdeskClient } from '@renderer/shared/api/client'
import { useTheme } from '@renderer/shared/hooks/use-theme'
import { toast } from '@renderer/shared/lib/toast'
import { useHotkey } from '@tanstack/react-hotkeys'
import { useNavigate } from '@tanstack/react-router'
import {
  Database,
  Download,
  FileCode2,
  LayoutDashboard,
  Layers,
  Moon,
  Play,
  Plus,
  Search,
  Settings,
  SquareCode,
  Sun,
  Table2Icon,
  Unplug,
  Workflow
} from 'lucide-react'
import { useState } from 'react'

type AddRowTarget = {
  connectionId: string
  schema: string
  table: string
  columns: ColumnInfo[]
}

export function QuickPanel() {
  const [open, setOpen] = useState(false)
  const [addRowOpen, setAddRowOpen] = useState(false)
  const [addRowTarget, setAddRowTarget] = useState<AddRowTarget | null>(null)
  const schemasWithTables = useSqlWorkspaceStore((s) => s.schemasWithTables)
  const currentConnectionId = useSqlWorkspaceStore((s) => s.currentConnectionId)
  const setCurrentConnection = useSqlWorkspaceStore((s) => s.setCurrentConnection)
  const setSidebarViewMode = useSqlWorkspaceStore((s) => s.setSidebarViewMode)
  const currentDashboard = useDashboardStore((s) => s.currentDashboard)
  const persistDashboard = useDashboardStore((s) => s.persistDashboard)
  const resetDashboard = useDashboardStore((s) => s.reset)

  const addTableTab = useTabStore((s) => s.addTableTab)
  const addQueryTab = useTabStore((s) => s.addQueryTab)
  const findQueryTabById = useTabStore((s) => s.findQueryTabById)
  const updateQueryTab = useTabStore((s) => s.updateQueryTab)
  const setActiveTab = useTabStore((s) => s.setActiveTab)
  const activeTab = useTabStore((s) => s.tabs.find((tab) => tab.id === s.activeTabId))
  const addSchemaDiagramTab = useTabStore((s) => s.addSchemaDiagramTab)
  const updateTableTab = useTabStore((s) => s.updateTableTab)
  const reset = useTabStore((s) => s.reset)
  const loadFromSerialized = useTabStore((s) => s.loadFromSerialized)
  const { theme, toggleTheme } = useTheme()

  const savedQueries = useSavedQueriesStore((s) => s.queries)

  const { data: connections } = useConnections()
  const { mutateAsync: connect } = useConnect()
  const { mutateAsync: disconnect } = useDisconnect()
  const navigate = useNavigate()

  const activeTable = activeTab?.kind === 'table' ? activeTab : undefined
  const activeQuery = activeTab?.kind === 'query' ? activeTab : undefined
  const exportCSVMutation = useExportTableAsCSV(currentConnectionId ?? '')
  const exportSQLMutation = useExportTableAsSQL(currentConnectionId ?? '')
  const insertRowMutation = useInsertTableRow(
    addRowTarget?.connectionId,
    addRowTarget?.schema,
    addRowTarget?.table
  )
  const { data: activeTableInfo } = useTableIntrospection(
    currentConnectionId ?? undefined,
    activeTable?.schema,
    activeTable?.table
  )

  useHotkey('Mod+K', () => setOpen((open) => !open), { preventDefault: true })
  useHotkey('Mod+P', () => setOpen((open) => !open), { preventDefault: true })

  const handleTableSelect = (schema: string, table: string) => {
    addTableTab(schema, table)
    setOpen(false)
  }

  const handleConnectionSelect = async (connectionId: string) => {
    if (connectionId === currentConnectionId) {
      setOpen(false)
      return
    }

    try {
      if (currentConnectionId) {
        await saveCurrentWorkspace()
      }
      await connect(connectionId)
      setCurrentConnection(connectionId)

      try {
        const savedWorkspace = await dbdeskClient.loadWorkspace(connectionId)
        if (savedWorkspace) {
          loadFromSerialized(savedWorkspace.tabs, savedWorkspace.activeTabId)
        } else {
          reset()
        }
      } catch (error) {
        console.warn('Failed to load workspace, using defaults:', error)
        reset()
      }

      navigate({
        to: '/$connectionId',
        params: { connectionId }
      })
      setOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to connect')
    }
  }

  const handleDisconnect = async () => {
    if (!currentConnectionId) return
    await saveCurrentWorkspace()

    if (currentDashboard?.connectionId === currentConnectionId) {
      await persistDashboard(currentDashboard.dashboardId).catch((error) => {
        console.warn('Failed to persist dashboard before disconnect:', error)
      })
    }

    await disconnect(currentConnectionId)
    setCurrentConnection(null)
    resetDashboard()
    reset()
    navigate({ to: '/' })
    setOpen(false)
  }

  const handleNewQuery = () => {
    addQueryTab()
    setOpen(false)
  }

  const handleLoadSavedQuery = (query: (typeof savedQueries)[0]) => {
    const existingTab = findQueryTabById(query.id)
    if (existingTab) {
      setActiveTab(existingTab.id)
    } else {
      const newTabId = addQueryTab()
      updateQueryTab(newTabId, {
        id: query.id,
        name: query.name,
        editorContent: query.content,
        lastSavedContent: query.content
      })
      setActiveTab(query.id)
    }
    setOpen(false)
  }

  const handleThemeToggle = () => {
    toggleTheme()
    setOpen(false)
  }

  const handleExecuteQuery = () => {
    window.dispatchEvent(new Event(EXECUTE_ACTIVE_QUERY_EVENT))
    setOpen(false)
  }

  const handleTableView = (view: 'tables' | 'structure') => {
    if (!activeTable) return
    updateTableTab(activeTable.id, { view })
    setOpen(false)
  }

  const handleExport = (format: 'csv' | 'sql') => {
    if (!activeTable) return
    const input = {
      schema: activeTable.schema,
      table: activeTable.table,
      options: { filters: activeTable.filters, sortRules: activeTable.sortRules }
    }
    if (format === 'csv') {
      exportCSVMutation.mutate(input)
    } else {
      exportSQLMutation.mutate(input)
    }
    setOpen(false)
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="cursor-pointer"
            aria-label="Open command palette"
            onClick={() => setOpen(true)}
          >
            <Search aria-hidden="true" className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Command palette (Ctrl/⌘ + K)</TooltipContent>
      </Tooltip>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        className="w-2xl max-w-none! border-3 rounded-md"
      >
        <CommandInput placeholder="Search commands, connections, tables, and queries..." />
        <CommandList className="max-h-[min(70vh,36rem)]">
          <CommandEmpty>No results found.</CommandEmpty>
          {currentConnectionId && (
            <>
              <CommandGroup heading="Commands" className="py-2">
                <CommandItem value="command: new query sql editor" onSelect={handleNewQuery}>
                  <Plus />
                  <span>New Query</span>
                </CommandItem>
                <CommandItem
                  value="command: run execute current query sql"
                  disabled={!activeQuery?.editorContent.trim()}
                  onSelect={handleExecuteQuery}
                >
                  <Play />
                  <span>Run Current Query</span>
                  <CommandShortcut>⌘↵</CommandShortcut>
                </CommandItem>
                <CommandItem
                  value="command: schema database diagram relationships"
                  onSelect={() => {
                    addSchemaDiagramTab()
                    setOpen(false)
                  }}
                >
                  <Workflow />
                  <span>Open Schema Diagram</span>
                </CommandItem>
              </CommandGroup>
              {activeTable && (
                <CommandGroup heading={`Table · ${activeTable.schema}.${activeTable.table}`}>
                  <CommandItem
                    value="command: table browse data rows"
                    onSelect={() => handleTableView('tables')}
                  >
                    <Table2Icon />
                    <span>Browse Table Data</span>
                  </CommandItem>
                  <CommandItem
                    value="command: table structure columns constraints indexes"
                    onSelect={() => handleTableView('structure')}
                  >
                    <Layers />
                    <span>View Table Structure</span>
                  </CommandItem>
                  <CommandItem
                    value="command: table add insert row"
                    disabled={!activeTableInfo}
                    onSelect={() => {
                      if (!currentConnectionId || !activeTableInfo) return
                      setAddRowTarget({
                        connectionId: currentConnectionId,
                        schema: activeTable.schema,
                        table: activeTable.table,
                        columns: activeTableInfo.columns
                      })
                      setOpen(false)
                      setAddRowOpen(true)
                    }}
                  >
                    <Plus />
                    <span>Add Row</span>
                  </CommandItem>
                  <CommandItem
                    value="command: table export download csv"
                    onSelect={() => handleExport('csv')}
                  >
                    <Download />
                    <span>Export Table as CSV</span>
                  </CommandItem>
                  <CommandItem
                    value="command: table export download sql"
                    onSelect={() => handleExport('sql')}
                  >
                    <FileCode2 />
                    <span>Export Table as SQL</span>
                  </CommandItem>
                </CommandGroup>
              )}
              <CommandGroup heading="Workspace">
                <CommandItem
                  value="command: show browse schemas tables"
                  onSelect={() => {
                    setSidebarViewMode('schemas')
                    setOpen(false)
                  }}
                >
                  <Database />
                  <span>Show Schemas</span>
                </CommandItem>
                <CommandItem
                  value="command: show saved queries"
                  onSelect={() => {
                    setSidebarViewMode('queries')
                    setOpen(false)
                  }}
                >
                  <SquareCode />
                  <span>Show Saved Queries</span>
                </CommandItem>
                <CommandItem
                  value="command: show dashboards"
                  onSelect={() => {
                    setSidebarViewMode('dashboards')
                    setOpen(false)
                  }}
                >
                  <LayoutDashboard />
                  <span>Show Dashboards</span>
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
            </>
          )}
          {connections && connections.length > 0 && (
            <>
              <CommandGroup heading="Connections" className="py-2">
                {connections.map((connection) => {
                  const isCurrent = connection.id === currentConnectionId
                  return (
                    <CommandItem
                      key={connection.id}
                      value={`connection: connect switch ${connection.name}`}
                      disabled={isCurrent}
                      onSelect={() => void handleConnectionSelect(connection.id)}
                      className="py-2!"
                    >
                      <Database />
                      <span>{connection.name}</span>
                      {isCurrent && <CommandShortcut>Current</CommandShortcut>}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}
          {currentConnectionId && savedQueries.length > 0 && (
            <CommandGroup heading="Saved Queries" className="py-2">
              {savedQueries.map((query) => (
                <CommandItem
                  key={query.id}
                  value={`saved query: ${query.name}`}
                  onSelect={() => handleLoadSavedQuery(query)}
                  className="py-2!"
                >
                  <SquareCode />
                  <span>{query.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {schemasWithTables.length > 0 && (
            <>
              <CommandGroup heading="Tables" className="py-2">
                {schemasWithTables.flatMap(({ schema, tables }) =>
                  tables.map((table) => {
                    const displayName = schema === 'public' ? table : `${schema}.${table}`
                    return (
                      <CommandItem
                        key={`${schema}:${table}`}
                        value={`table: ${schema} ${table} ${displayName}`}
                        onSelect={() => handleTableSelect(schema, table)}
                        className="py-2!"
                      >
                        <Table2Icon />
                        <span>{displayName}</span>
                      </CommandItem>
                    )
                  })
                )}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}
          <CommandGroup heading="General Settings" className="py-2">
            <CommandItem
              onSelect={() => {
                useSettingsStore.getState().openSettings()
                setOpen(false)
              }}
              className="py-2!"
            >
              <Settings />
              <span>Open Settings</span>
            </CommandItem>
            <CommandItem onSelect={handleThemeToggle} className="py-2!">
              {theme === 'light' ? <Moon /> : <Sun />}
              <span>Toggle Theme</span>
            </CommandItem>
            {currentConnectionId && (
              <CommandItem value="command: disconnect connection" onSelect={handleDisconnect}>
                <Unplug />
                <span>Disconnect</span>
              </CommandItem>
            )}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
      {addRowTarget && (
        <AddRowSheet
          open={addRowOpen}
          onOpenChange={(nextOpen) => {
            setAddRowOpen(nextOpen)
            if (!nextOpen) setAddRowTarget(null)
          }}
          columns={addRowTarget.columns}
          tableName={addRowTarget.table}
          onSubmit={(values) => {
            insertRowMutation.mutate(values, {
              onSuccess: () => {
                setAddRowOpen(false)
                setAddRowTarget(null)
              }
            })
          }}
          isPending={insertRowMutation.isPending}
        />
      )}
    </>
  )
}
