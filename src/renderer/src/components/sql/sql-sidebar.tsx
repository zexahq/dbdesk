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
import { useSchemas, useTables } from '@renderer/api/queries/schema'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { DatabaseIcon, SearchIcon, Table2Icon } from 'lucide-react'
import type { SQLConnectionProfile } from '@common/types'

type DbSidebarProps = {
  profile: SQLConnectionProfile
  selectedSchema: string | null
  selectedTable: string | null
  onSchemaSelect: (schema: string) => void
  onTableSelect: (table: string) => void
}

export function DbSidebar({
  profile,
  selectedSchema,
  selectedTable,
  onSchemaSelect,
  onTableSelect
}: DbSidebarProps) {
  const [search, setSearch] = React.useState('')

  const { data: schemas = [], isLoading: loadingSchemas } = useSchemas(profile.id)
  const { data: tables = [], isLoading: loadingTables } = useTables(
    profile.id,
    selectedSchema || undefined
  )

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
                onSchemaSelect(v)
              }}
              disabled={loadingSchemas || schemas.length === 0}
            >
              <SelectTrigger className="w-full h-10 pl-8 py-5">
                <SelectValue placeholder={loadingSchemas ? 'Loading…' : 'Select schema'} />
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
          <div className="relative">
            <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <SidebarInput
              placeholder="Search tables…"
              className="h-10 pl-8 py-4"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </SidebarGroup>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent className="pb-8">
        <SidebarGroup>
          <SidebarGroupLabel>Tables</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {loadingTables ? (
                <SidebarMenuItem>
                  <SidebarMenuButton aria-disabled>Loading tables…</SidebarMenuButton>
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
                        onTableSelect(table)
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
