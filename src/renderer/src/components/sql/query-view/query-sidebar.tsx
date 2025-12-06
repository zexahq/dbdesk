import type { SQLConnectionProfile } from '@common/types'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader
} from '@renderer/components/ui/sidebar'
import { useSqlWorkspaceStore } from '@renderer/store/sql-workspace-store'
import { Button } from '../../ui/button'
import { ArrowLeft } from 'lucide-react'

type QuerySidebarProps = {
  profile: SQLConnectionProfile
}

export function QuerySidebar({ profile }: QuerySidebarProps) {
  const { setView } = useSqlWorkspaceStore()

  return (
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
            {/* Saved queries will be displayed here later */}
            <div className="p-4 text-sm text-muted-foreground text-center">
              No saved queries yet
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
