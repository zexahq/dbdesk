import type { SQLConnectionProfile } from '@common/types'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader
} from '@renderer/components/ui/sidebar'

type QuerySidebarProps = {
  profile: SQLConnectionProfile
}

export function QuerySidebar({ profile }: QuerySidebarProps) {
  return (
    <Sidebar className="border-r w-full h-full" collapsible="none">
      <SidebarHeader>
        <SidebarGroupLabel>{profile.name}</SidebarGroupLabel>
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
