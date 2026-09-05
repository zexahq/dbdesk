'use client'

import { dbdeskClient } from '@renderer/shared/api/client'
import {
  useConnect,
  useConnections,
  useDisconnect
} from '@renderer/features/connections/queries/connections'
import { useDashboardStore } from '@renderer/features/sql-workspace/stores/dashboard-store'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from '@renderer/components/ui/command'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { useTheme } from '@renderer/shared/hooks/use-theme'
import { toast } from '@renderer/shared/lib/toast'
import { saveCurrentWorkspace } from '@renderer/features/sql-workspace/lib/workspace'
import { useSettingsStore } from '@renderer/features/settings/stores/settings-store'
import { useSavedQueriesStore } from '@renderer/features/sql-workspace/stores/saved-queries-store'
import { useSqlWorkspaceStore } from '@renderer/features/sql-workspace/stores/sql-workspace-store'
import { useTabStore } from '@renderer/features/sql-workspace/stores/tab-store'
import { useNavigate } from '@tanstack/react-router'
import {
  Database,
  Moon,
  Plus,
  Search,
  Settings,
  SquareCode,
  Sun,
  Table2Icon,
  Unplug
} from 'lucide-react'
import * as React from 'react'
import { useHotkey } from '@tanstack/react-hotkeys'
import { useState } from 'react'
import { Button } from '@renderer/components/ui/button'

export function QuickPanel() {
  const [open, setOpen] = useState(false)
  const schemasWithTables = useSqlWorkspaceStore((s) => s.schemasWithTables)
  const currentConnectionId = useSqlWorkspaceStore((s) => s.currentConnectionId)
  const setCurrentConnection = useSqlWorkspaceStore((s) => s.setCurrentConnection)
  const currentDashboard = useDashboardStore((s) => s.currentDashboard)
  const persistDashboard = useDashboardStore((s) => s.persistDashboard)
  const resetDashboard = useDashboardStore((s) => s.reset)

  const addTableTab = useTabStore((s) => s.addTableTab)
  const addQueryTab = useTabStore((s) => s.addQueryTab)
  const findQueryTabById = useTabStore((s) => s.findQueryTabById)
  const updateQueryTab = useTabStore((s) => s.updateQueryTab)
  const setActiveTab = useTabStore((s) => s.setActiveTab)
  const reset = useTabStore((s) => s.reset)
  const loadFromSerialized = useTabStore((s) => s.loadFromSerialized)
  const { theme, toggleTheme } = useTheme()

  const savedQueries = useSavedQueriesStore((s) => s.queries)

  const { data: connections } = useConnections()
  const { mutateAsync: connect } = useConnect()
  const { mutateAsync: disconnect } = useDisconnect()
  const navigate = useNavigate()

  useHotkey('Mod+P', () => setOpen((open) => !open), { preventDefault: true })

  const handleTableSelect = (schema: string, table: string) => {
    addTableTab(schema, table)
    setOpen(false)
  }

  const handleConnectionSelect = async (connectionId: string) => {
    try {
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

  return (
    <>
      <Button variant="ghost" size="icon" className="cursor-pointer" onClick={() => setOpen(true)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <kbd>
              <Search className="size-4" />
            </kbd>
          </TooltipTrigger>
          <TooltipContent>
            <p>Quick Search (Ctrl + K)</p>
          </TooltipContent>
        </Tooltip>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        className="w-2xl max-w-none! border-3 rounded-md"
      >
        <CommandInput placeholder="Type a schema or table name..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {!currentConnectionId && connections && connections.length > 0 && (
            <>
              <CommandGroup heading="Connections" className="py-2">
                {connections.map((connection) => (
                  <CommandItem
                    key={connection.id}
                    onSelect={() => handleConnectionSelect(connection.id)}
                    className="py-2!"
                  >
                    <Database className="size-4 mr-2" />
                    <span className="text-sm">{connection.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              {schemasWithTables.length > 0 && <CommandSeparator />}
            </>
          )}
          {currentConnectionId && (
            <>
              <CommandGroup heading="Query" className="py-2">
                <CommandItem onSelect={handleNewQuery} className="py-2!">
                  <Plus className="size-4 mr-2" />
                  <span className="text-sm">New Query</span>
                </CommandItem>
              </CommandGroup>
              <CommandGroup heading="Connection Actions" className="py-2">
                <CommandItem onSelect={handleDisconnect} className="py-2!">
                  <Unplug className="size-4 mr-2" />
                  <span className="text-sm">Disconnect</span>
                </CommandItem>
              </CommandGroup>
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
              <Settings className="size-4 mr-2" />
              <span className="text-sm">Open Settings</span>
            </CommandItem>
            <CommandItem onSelect={handleThemeToggle} className="py-2!">
              {theme === 'light' ? (
                <Moon className="size-4 mr-2" />
              ) : (
                <Sun className="size-4 mr-2" />
              )}
              <span className="text-sm">Toggle Theme</span>
            </CommandItem>
          </CommandGroup>
          {currentConnectionId && savedQueries.length > 0 && (
            <CommandGroup heading="Saved Queries" className="py-2">
              {savedQueries.map((query) => (
                <CommandItem
                  key={query.id}
                  value={`saved-query: ${query.name}`}
                  onSelect={() => handleLoadSavedQuery(query)}
                  className="py-2!"
                >
                  <SquareCode className="size-4 mr-2" />
                  <span className="text-sm">{query.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {schemasWithTables.length > 0 && (
            <>
              <CommandGroup heading="Entities" className="py-2">
                {schemasWithTables.map(({ schema, tables }) => {
                  if (tables.length === 0) return null

                  return (
                    <React.Fragment key={schema}>
                      <CommandItem disabled className="text-xs text-muted-foreground">
                        {schema}
                      </CommandItem>
                      {tables.map((table) => {
                        const displayName = schema === 'public' ? table : `${schema}.${table}`
                        return (
                          <CommandItem
                            key={`${schema}:${table}`}
                            onSelect={() => handleTableSelect(schema, table)}
                            className="ml-4 py-2!"
                          >
                            <Table2Icon />
                            <span className="text-sm">{displayName}</span>
                          </CommandItem>
                        )
                      })}
                    </React.Fragment>
                  )
                })}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
