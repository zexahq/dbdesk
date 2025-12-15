'use client'

import { dbdeskClient } from '@renderer/api/client'
import { useConnect, useConnections, useDisconnect } from '@renderer/api/queries/connections'
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
import { useTheme } from '@renderer/hooks/use-theme'
import { saveCurrentWorkspace } from '@renderer/lib/workspace'
import { useQueryTabStore } from '@renderer/store/query-tab-store'
import { useSqlWorkspaceStore } from '@renderer/store/sql-workspace-store'
import { useTabStore } from '@renderer/store/tab-store'
import { useNavigate } from '@tanstack/react-router'
import { CodeIcon, Database, Moon, Search, Sun, Table2Icon, Unplug } from 'lucide-react'
import * as React from 'react'
import { useEffect, useState } from 'react'
import { Button } from './ui/button'

export function QuickPanel() {
  const [open, setOpen] = useState(false)
  const { schemasWithTables, currentConnectionId, setCurrentConnection, view, setView } =
    useSqlWorkspaceStore()

  const { addTab, reset: resetTabs, loadFromSerialized: loadTabs } = useTabStore()
  const { reset: resetQueryTabs, loadFromSerialized: loadQueryTabs } = useQueryTabStore()
  const { theme, toggleTheme } = useTheme()

  const { data: connections } = useConnections()
  const { mutateAsync: connect } = useConnect()
  const { mutateAsync: disconnect } = useDisconnect()
  const navigate = useNavigate()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'p' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const handleTableSelect = (schema: string, table: string) => {
    // Create or switch to tab for this table
    addTab(schema, table)
    setOpen(false)
  }

  const handleConnectionSelect = async (connectionId: string) => {
    try {
      await connect(connectionId)
      setCurrentConnection(connectionId)

      // Try to restore saved workspace
      try {
        const savedWorkspace = await dbdeskClient.loadWorkspace(connectionId)
        if (savedWorkspace) {
          // Restore saved state
          loadTabs(savedWorkspace.tableTabs, savedWorkspace.activeTableTabId)
          loadQueryTabs(savedWorkspace.queryTabs, savedWorkspace.activeQueryTabId)
          setView(savedWorkspace.workspaceView)
        } else {
          // No saved state, use defaults
          resetTabs()
          resetQueryTabs()
          setView('table')
        }
      } catch (error) {
        // If workspace loading fails, fall back to defaults
        console.warn('Failed to load workspace, using defaults:', error)
        resetTabs()
        resetQueryTabs()
        setView('table')
      }

      navigate({
        to: '/connections/$connectionId',
        params: { connectionId }
      })
      setOpen(false)
    } catch (error) {
      console.error('Failed to connect:', error)
    }
  }

  const handleDisconnect = async () => {
    if (!currentConnectionId) return
    await saveCurrentWorkspace()

    await disconnect(currentConnectionId)
    setCurrentConnection(null)
    setView('table')
    resetTabs()
    resetQueryTabs()
    navigate({ to: '/' })
    setOpen(false)
  }

  const handleThemeToggle = () => {
    toggleTheme()
    setOpen(false)
  }

  const handleViewToggle = () => {
    setView(view === 'table' ? 'query' : 'table')
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
            <CommandGroup heading="Connection Actions" className="py-2">
              <CommandItem onSelect={handleDisconnect} className="py-2!">
                <Unplug className="size-4 mr-2" />
                <span className="text-sm">Disconnect</span>
              </CommandItem>
              <CommandItem onSelect={handleViewToggle} className="py-2!">
                {view === 'table' ? <CodeIcon /> : <Table2Icon />}
                <span className="text-sm">
                  {view === 'table' ? 'Switch to Query View' : 'Switch to Table View'}
                </span>
              </CommandItem>
            </CommandGroup>
          )}
          <CommandGroup heading="General Settings" className="py-2">
            <CommandItem onSelect={handleThemeToggle} className="py-2!">
              {theme === 'light' ? (
                <Moon className="size-4 mr-2" />
              ) : (
                <Sun className="size-4 mr-2" />
              )}
              <span className="text-sm">Toggle Theme</span>
            </CommandItem>
          </CommandGroup>
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
