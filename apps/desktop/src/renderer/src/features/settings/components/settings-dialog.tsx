import { Info, RefreshCw, TerminalSquare } from 'lucide-react'
import { useHotkey } from '@tanstack/react-hotkeys'
import { useEffect, useState } from 'react'
import dbdeskLogo from '@renderer/assets/dbdesk-logo.svg'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle
} from '@renderer/components/ui/dialog'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider
} from '@renderer/components/ui/sidebar'
import { useSettingsStore, type SettingsSection } from '../stores/settings-store'
import { CliSection } from './cli-section'
import { UpdatesSection } from './updates-section'
import { AboutSection } from './about-section'

const NAV: { id: SettingsSection; name: string; icon: typeof Info; blurb: string }[] = [
  {
    id: 'cli',
    name: 'Command Line',
    icon: TerminalSquare,
    blurb: 'Install and manage the dbdesk CLI'
  },
  { id: 'updates', name: 'Updates', icon: RefreshCw, blurb: 'App version and updates' },
  { id: 'about', name: 'About', icon: Info, blurb: 'About DBDesk' }
]

export function SettingsDialog() {
  const open = useSettingsStore((s) => s.open)
  const section = useSettingsStore((s) => s.section)
  const closeSettings = useSettingsStore((s) => s.closeSettings)
  const setSection = useSettingsStore((s) => s.setSection)
  const openSettings = useSettingsStore((s) => s.openSettings)
  const [version, setVersion] = useState('')

  useHotkey('Mod+,', () => openSettings(), { preventDefault: true })

  useEffect(() => {
    if (!open) return
    window.dbdesk
      .getAppVersion()
      .then((v) => setVersion(v.version))
      .catch(() => {})
  }, [open])

  const active = NAV.find((item) => item.id === section) ?? NAV[0]

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeSettings()}>
      <DialogContent className="overflow-hidden p-0 md:max-h-[500px] md:max-w-[700px] lg:max-w-[800px]">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">Customize your settings here.</DialogDescription>
        <SidebarProvider className="items-start">
          <Sidebar collapsible="none" className="hidden md:flex">
            <SidebarHeader>
              <div className="flex items-center gap-2 px-2 py-1">
                <img
                  src={dbdeskLogo}
                  alt="DBDesk"
                  className="w-5 h-5 brightness-0 dark:brightness-100"
                />
                <span className="text-sm font-medium">DBDesk</span>
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {NAV.map((item) => (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          isActive={item.id === section}
                          onClick={() => setSection(item.id)}
                        >
                          <item.icon />
                          <span>{item.name}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <main className="flex h-[480px] flex-1 min-w-0 flex-col overflow-hidden">
            <header className="flex h-16 shrink-0 items-center px-4">
              <div>
                <p className="text-sm font-medium">{active?.name}</p>
                <p className="text-xs text-muted-foreground">{active?.blurb}</p>
              </div>
            </header>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-4 pt-0">
              {section === 'cli' && <CliSection />}
              {section === 'updates' && <UpdatesSection version={version} />}
              {section === 'about' && <AboutSection version={version} />}
            </div>
          </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  )
}
