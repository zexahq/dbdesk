'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { Search, Table2Icon, Database, Unplug } from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from '@renderer/components/ui/command'
import { Button } from './ui/button'
import { useSqlWorkspaceStore } from '@renderer/store/sql-workspace-store'
import { useConnections, useConnect, useDisconnect } from '@renderer/api/queries/connections'
import { useNavigate } from '@tanstack/react-router'

export function QuickPanel() {
  const [open, setOpen] = useState(false)
  const {
    setSelectedSchema,
    setSelectedTable,
    schemasWithTables,
    currentConnectionId,
    setCurrentConnection
  } = useSqlWorkspaceStore()
  const { data: connections } = useConnections()
  const { mutateAsync: connect } = useConnect()
  const { mutateAsync: disconnect } = useDisconnect()
  const navigate = useNavigate()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const handleTableSelect = (schema: string, table: string) => {
    setSelectedSchema(schema)
    setSelectedTable(table)
    setOpen(false)
  }

  const handleConnectionSelect = async (connectionId: string) => {
    try {
      await connect(connectionId)
      setCurrentConnection(connectionId)
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
    await disconnect(currentConnectionId)
    setCurrentConnection(null)
    navigate({ to: '/' })
    setOpen(false)
  }

  return (
    <>
      <Button variant="ghost" size="icon" className="cursor-pointer" onClick={() => setOpen(true)}>
        <kbd>
          <Search className="size-4" />
        </kbd>
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
            <CommandGroup heading="Quick Actions" className="py-2">
              <CommandItem onSelect={handleDisconnect} className="py-2!">
                <Unplug className="mr-2" />
                <span className="text-sm">Disconnect</span>
              </CommandItem>
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
