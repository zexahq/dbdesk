import type { ConnectionProfile, DatabaseType } from '@common/types'
import { useConnections, useDeleteConnection, useCreateConnection, useConnect } from '@renderer/api/queries/connections'
import { Button } from '@renderer/components/ui/button'
import { error as showError, success as showSuccess } from '@renderer/lib/toast'
import { ChevronDown, Database, Folder, Globe, Tag, X } from 'lucide-react'
import { FormEvent, useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ConnectionDialog } from './connection-dialog'

export function ConnectionList() {
  const { data: connections, isLoading, isError, error } = useConnections()
  const deleteConnection = useDeleteConnection()
  const createConnection = useCreateConnection()
  const connect = useConnect()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingConnection, setEditingConnection] = useState<ConnectionProfile | null>(null)
  const [selectedDatabaseType, setSelectedDatabaseType] = useState<DatabaseType>('postgres')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [showConnectionHistory, setShowConnectionHistory] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [connectionString, setConnectionString] = useState<string>('')
  const [dbTypeDropdownOpen, setDbTypeDropdownOpen] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (isError && error) {
      showError(error instanceof Error ? error.message : 'Failed to load connections')
    }
  }, [isError, error])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        setShowConnectionHistory(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleNewConnection = (type: DatabaseType) => {
    setSelectedDatabaseType(type)
    setEditingConnection(null)
    setIsModalOpen(true)
    setIsDropdownOpen(false)
  }

  const handleEditConnection = (profile: ConnectionProfile) => {
    setEditingConnection(profile)
    setSelectedDatabaseType(profile.type)
    setIsModalOpen(true)
  }

  const handleDeleteConnection = async (profile: ConnectionProfile) => {
    try {
      await deleteConnection.mutateAsync(profile.id)
      showSuccess('Connection deleted successfully')
    } catch (error) {
      console.error('Delete error:', error)
      showError(error instanceof Error ? error.message : 'Failed to delete connection')
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!connectionString.trim()) {
      showError('Please enter a connection string')
      return
    }

    setIsConnecting(true)

    try {
      // Parse the connection string to validate format
      // Support format: protocol://user:password@host:port/database or protocol://user:password@host:port/database?name=ConnectionName
      const urlMatch = connectionString.match(/^(\w+):\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)(?:\?name=(.+))?$/)

      if (!urlMatch) {
        showError('Invalid connection string format. Expected: protocol://user:password@host:port/database')
        setIsConnecting(false)
        return
      }

      const [, protocol, user, password, host, port, database, customName] = urlMatch
      const type = protocol === 'postgresql' ? 'postgres' : protocol as DatabaseType

      // Enable SSL for cloud databases (Supabase, AWS RDS, etc.)
      const connectionOptions = {
        host,
        port: parseInt(port),
        database,
        user,
        password,
        sslMode: 'require' as const
      }

      // Check if a connection with the same details already exists
      const existingConnection = connections?.find(conn => {
        if (conn.type !== type) return false
        if (conn.type === 'postgres' || conn.type === 'mysql') {
          const opts = conn.options
          return opts.host === host &&
                 opts.port === parseInt(port) &&
                 opts.database === database &&
                 opts.user === user
        }
        return false
      })

      let connectionToUse: ConnectionProfile
      let isNewlyCreated = false

      if (existingConnection) {
        // Use the existing connection
        connectionToUse = existingConnection
      } else {
        // Create a new connection with a meaningful name
        const connectionName = customName || database
        const newConnection = await createConnection.mutateAsync({
          name: connectionName,
          type,
          options: connectionOptions
        })

        if (!newConnection || !newConnection.id) {
          showError('Failed to save connection')
          setIsConnecting(false)
          return
        }
        connectionToUse = newConnection
        isNewlyCreated = true
      }

      // Now connect
      try {
        const connectResult = await connect.mutateAsync(connectionToUse.id)

        if (!connectResult.success) {
          // Only delete if we just created it
          if (isNewlyCreated) {
            try {
              await deleteConnection.mutateAsync(connectionToUse.id)
            } catch (deleteError) {
              console.error('Failed to cleanup connection after failed connect:', deleteError)
            }
          }
          showError('Failed to connect to database. Please check your connection details and ensure SSL is enabled.')
          setIsConnecting(false)
          return
        }
      } catch (connectError) {
        // Only delete if we just created it
        if (isNewlyCreated) {
          try {
            await deleteConnection.mutateAsync(connectionToUse.id)
          } catch (deleteError) {
            console.error('Failed to cleanup connection after failed connect:', deleteError)
          }
        }
        const errorMsg = connectError instanceof Error ? connectError.message : 'Unknown connection error'
        showError(`Connection failed: ${errorMsg}`)
        setIsConnecting(false)
        return
      }

      showSuccess('Connected successfully!')
      setConnectionString('')

      // Navigate to the connection view
      navigate({
        to: '/connections/$connectionId',
        params: { connectionId: connectionToUse.id }
      })
    } catch (error) {
      console.error('Connection error:', error)
      showError(error instanceof Error ? error.message : 'Failed to connect')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleModalOpenChange = (open: boolean) => {
    setIsModalOpen(open)
    if (!open) {
      setEditingConnection(null)
    }
  }

  const fillConnectionString = (profile: ConnectionProfile) => {
    if (profile.type === 'postgres' || profile.type === 'mysql') {
      const { host, port, database, user, password } = profile.options
      const protocol = profile.type === 'postgres' ? 'postgresql' : 'mysql'
      const connectionStr = `${protocol}://${user}:${password}@${host}:${port}/${database}`
      setConnectionString(connectionStr)
      setSelectedDatabaseType(profile.type)
      setShowConnectionHistory(false)
    }
  }

  const hasConnections = (connections?.length ?? 0) > 0

  return (
    <div className="h-full flex flex-col items-center justify-center relative overflow-hidden">
      {/* Grayscale video background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover grayscale brightness-60 pointer-events-none -z-2"
        onError={(e) => {
          // Fallback if video fails to load - just show solid background
          console.warn('Failed to load background video')
          e.currentTarget.style.display = 'none'
        }}
      >
        <source src="/bg.mp4" type="video/mp4" />
      </video>
      <div className="fixed inset-0 bg-black/40 -z-1" />

      <div className="w-full max-w-6xl text-center relative z-10">
        <div className="space-y-12">
          <div className="space-y-3">
            <h1 className="text-5xl font-bold tracking-tight">Welcome to DBDesk</h1>
            <p className="text-xl text-muted-foreground">
              Connect to your PostgreSQL or MySQL database to get started
            </p>
          </div>

          {/* Quick Connect Form */}
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto relative" ref={formRef}>
            <div className="relative flex items-stretch gap-2 bg-card/80 backdrop-blur-sm border border-border rounded-xl p-2 shadow-lg">
              <div className="w-44 relative">
                <button
                  type="button"
                  className="w-full h-full px-4 py-3 bg-secondary/20 hover:bg-secondary/30 text-foreground text-sm text-left flex items-center justify-between rounded-lg transition-colors"
                  onClick={() => setDbTypeDropdownOpen(!dbTypeDropdownOpen)}
                >
                  {selectedDatabaseType === 'postgres' ? 'PostgreSQL' : 'MySQL'}
                  <ChevronDown className="size-4" />
                </button>
                {dbTypeDropdownOpen && (
                  <div className="absolute top-full left-0 mt-4 w-full bg-popover border border-border rounded-md shadow-lg z-50">
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-sm text-left hover:bg-accent rounded-t-md"
                      onClick={() => {
                        setSelectedDatabaseType('postgres')
                        setDbTypeDropdownOpen(false)
                      }}
                    >
                      PostgreSQL
                    </button>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-sm text-left hover:bg-accent rounded-b-md"
                      onClick={() => {
                        setSelectedDatabaseType('mysql')
                        setDbTypeDropdownOpen(false)
                      }}
                    >
                      MySQL
                    </button>
                  </div>
                )}
              </div>
              <div className="relative flex-1">
                <input
                  type="text"
                  value={connectionString}
                  onChange={(e) => setConnectionString(e.target.value)}
                  onFocus={() => setShowConnectionHistory(true)}
                  placeholder="Connection string"
                  className="w-full h-full px-4 py-3 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
                />
              </div>
              <button
                type="submit"
                disabled={isConnecting || !connectionString}
                className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground transition disabled:opacity-50 flex items-center justify-center font-bold text-sm tracking-tight rounded-lg disabled:cursor-not-allowed h-full cursor-pointer"
              >
                {isConnecting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-white" />
                ) : (
                  'Connect'
                )}
              </button>
            </div>
            {showConnectionHistory && hasConnections && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-popover border border-border shadow-lg max-h-60 overflow-y-auto rounded-md backdrop-blur-sm z-10">
                {connections!.map((profile) => {
                  const dbTypeColors = {
                    postgres: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                    mysql: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
                    mongodb: 'bg-green-500/20 text-green-400 border-green-500/30',
                    redis: 'bg-red-500/20 text-red-400 border-red-500/30'
                  }

                  const dbTypeLabel = {
                    postgres: 'PostgreSQL',
                    mysql: 'MySQL',
                    mongodb: 'MongoDB',
                    redis: 'Redis'
                  }

                  return (
                    <div
                      key={profile.id}
                      className="px-4 py-3 text-left hover:bg-accent hover:text-accent-foreground cursor-pointer first:rounded-t-md last:rounded-b-md relative transition-colors"
                      onClick={() => fillConnectionString(profile)}
                    >
                      <div className="flex items-start gap-2 mr-8">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium mb-2 flex items-center gap-1.5">
                            <Tag className="size-3.5 text-muted-foreground" />
                            {profile.name}
                          </div>
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap gap-1.5">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${dbTypeColors[profile.type]}`}>
                                <Database className="size-3" />
                                {dbTypeLabel[profile.type]}
                              </span>
                              {profile.type === 'postgres' || profile.type === 'mysql' ? (
                                <>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border bg-purple-500/20 text-purple-400 border-purple-500/30">
                                    <Globe className="size-3" />
                                    {profile.options.host}:{profile.options.port}
                                  </span>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                                    <Folder className="size-3" />
                                    {profile.options.database}
                                  </span>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div
                        className="absolute right-2 top-2 text-muted-foreground hover:text-foreground cursor-pointer text-xs p-1.5 flex items-center justify-center rounded hover:bg-destructive/20 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteConnection(profile)
                        }}
                      >
                        <X className="w-3 h-3 shrink-0" />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </form>

          <div className="flex items-center justify-center gap-4 max-w-2xl mx-auto">
            <div className="h-px flex-1 bg-border/50"></div>
            <span className="text-sm text-muted-foreground font-medium">OR</span>
            <div className="h-px flex-1 bg-border/50"></div>
          </div>

          {/* Saved Connections Section */}
          <div className="max-w-2xl mx-auto relative" ref={dropdownRef}>
            <Button
              className="cursor-pointer px-8 py-6 text-lg w-full shadow-lg"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              {'Create New Connection'}
              <ChevronDown className="size-5" />
            </Button>
            {isDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-2 rounded-md border bg-popover shadow-lg z-50 max-h-88 overflow-y-auto overflow-x-hidden">
                <div className="p-1">
                  {/* New Connection Options */}
                  <div className="border-b pb-1 mb-1">
                    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                      Create New
                    </div>
                    <div className="flex gap-2 px-2 pb-2 h-fit relative">
                      <Button
                        variant={"ghost"}
                        className="flex-1 text-center px-3 py-2 text-sm rounded-xs bg-muted hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                        onClick={() => handleNewConnection('postgres')}
                      >
                        + New PostgreSQL Connection
                      </Button>
                      <div className='w-[1.5px] h-9 bg-white/20' />
                      <Button
                        variant={"ghost"}
                        className="flex-1 text-center px-3 py-2 text-sm rounded-xs bg-muted hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                        onClick={() => handleNewConnection('mysql')}
                      >
                        + New MySQL Connection
                      </Button>
                    </div>
                  </div>

                  {/* Saved Connections List */}
                  {isLoading ? (
                    <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                      Loading connections...
                    </div>
                  ) : isError ? (
                    <div className="px-3 py-4 text-sm text-destructive">
                      Failed to load connections
                    </div>
                  ) : hasConnections ? (
                    <>
                      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                        Saved Connections ({connections?.length})
                      </div>
                      {connections?.map((profile) => {
                        const dbTypeColors = {
                          postgres: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                          mysql: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
                          mongodb: 'bg-green-500/20 text-green-400 border-green-500/30',
                          redis: 'bg-red-500/20 text-red-400 border-red-500/30'
                        }

                        const dbTypeLabel = {
                          postgres: 'PostgreSQL',
                          mysql: 'MySQL',
                          mongodb: 'MongoDB',
                          redis: 'Redis'
                        }

                        return (
                          <button
                            key={profile.id}
                            className="w-full cursor-pointer text-left px-3 py-3 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors relative group"
                            onClick={() => {
                              handleEditConnection(profile)
                              setIsDropdownOpen(false)
                            }}
                          >
                            <div className="flex items-start gap-2 mr-8">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium mb-2 flex items-center gap-1.5">
                                  <Tag className="size-3.5 text-muted-foreground" />
                                  {profile.name}
                                </div>
                                <div className="flex flex-col gap-2">
                                  <div className="flex flex-wrap gap-1.5">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${dbTypeColors[profile.type]}`}>
                                      <Database className="size-3" />
                                      {dbTypeLabel[profile.type]}
                                    </span>
                                    {profile.type === 'postgres' || profile.type === 'mysql' ? (
                                      <>
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border bg-purple-500/20 text-purple-400 border-purple-500/30">
                                          <Globe className="size-3" />
                                          {profile.options.host}:{profile.options.port}
                                        </span>
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                                          <Folder className="size-3" />
                                          {profile.options.database}
                                        </span>
                                      </>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/20 rounded absolute right-2 top-2"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteConnection(profile)
                              }}
                            >
                              <X className="size-3 text-muted-foreground" />
                            </div>
                          </button>
                        )
                      })}
                    </>
                  ) : (
                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                      No saved connections
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <ConnectionDialog
          open={isModalOpen}
          onOpenChange={handleModalOpenChange}
          connection={editingConnection}
          databaseType={selectedDatabaseType}
        />
      </div>
    </div>
  )
}
