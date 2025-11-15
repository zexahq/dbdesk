import * as React from 'react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator
} from '@renderer/components/ui/sidebar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { DatabaseIcon, SearchIcon, Table2Icon, RefreshCcw } from 'lucide-react'
import type { SQLConnectionProfile } from '@common/types'
import { useSqlWorkspaceStore } from '@renderer/store/sql-workspace-store'
import { Button } from '../ui/button'
import { useDataTableStore } from '@renderer/store/data-table-store'

type DbSidebarProps = {
  profile: SQLConnectionProfile
  onRefresh: () => void
}

export function DbSidebar({ profile, onRefresh }: DbSidebarProps) {
  const [search, setSearch] = React.useState('')

  const { selectedSchema, selectedTable, setSelectedSchema, setSelectedTable, schemasWithTables } =
    useSqlWorkspaceStore()
  const { reset } = useDataTableStore()

  const schemas = schemasWithTables.map((s) => s.schema)
  const tables = selectedSchema
    ? schemasWithTables.find((s) => s.schema === selectedSchema)?.tables || []
    : []

  const filteredTables = React.useMemo(() => {
    if (!search) return tables
    const q = search.toLowerCase()
    return tables.filter((t) => t.toLowerCase().includes(q))
  }, [tables, search])

  return (
    <Sidebar className="border-r w-full h-full" collapsible="none">
      <SidebarHeader>
        <SidebarGroupLabel>{profile.name}</SidebarGroupLabel>
        <SidebarGroup className="flex flex-col gap-2">
          <div className="relative">
            <DatabaseIcon className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Select
              value={selectedSchema || ''}
              onValueChange={(v) => {
                setSelectedSchema(v)
                setSelectedTable(null)
                reset()
              }}
              disabled={schemas.length === 0}
            >
              <SelectTrigger className="w-full h-10 pl-8 py-5">
                <SelectValue placeholder="Select schema" />
              </SelectTrigger>
              <SelectContent>
                {schemas.map((schema) => (
                  <SelectItem key={schema} value={schema}>
                    {schema}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full">
              <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <SidebarInput
                placeholder="Search tables…"
                className="h-10 pl-8 py-4"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="ghost" size="icon" className="cursor-pointer" onClick={onRefresh}>
              <RefreshCcw className="size-4" />
            </Button>
          </div>
        </SidebarGroup>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Tables</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {!selectedSchema ? (
                <SidebarMenuItem>
                  <SidebarMenuButton aria-disabled>Select a schema first</SidebarMenuButton>
                </SidebarMenuItem>
              ) : filteredTables.length === 0 ? (
                <SidebarMenuItem>
                  <SidebarMenuButton aria-disabled>No tables</SidebarMenuButton>
                </SidebarMenuItem>
              ) : (
                filteredTables.map((table) => (
                  <SidebarMenuItem key={table}>
                    <SidebarMenuButton
                      onClick={() => {
                        setSelectedTable(table)
                        reset()
                      }}
                      className="cursor-pointer"
                      isActive={selectedTable === table ? true : false}
                    >
                      <Table2Icon className="size-4" />
                      <span>{table}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
