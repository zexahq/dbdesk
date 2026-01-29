import { LayoutDashboard } from 'lucide-react'
import { useState } from 'react'
import { Button } from './ui/button'
import { QuickPanel } from './quick-panel'
import { ThemeToggle } from './theme-toggle'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from './ui/sheet'
import { useSqlWorkspaceStore } from '@renderer/store/sql-workspace-store'
import { useDashboardStore } from '@renderer/store/dashboard-store'
import { createDashboard } from '@renderer/api/dashboard'
import { useEffect } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function MainSidebar() {
  const [dashboardSheetOpen, setDashboardSheetOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const currentConnectionId = useSqlWorkspaceStore((s) => s.currentConnectionId)
  const { dashboards, setCurrentDashboard, loadDashboards } = useDashboardStore()

  // Load dashboards when connection changes
  useEffect(() => {
    if (currentConnectionId) {
      loadDashboards(currentConnectionId).catch((err) => {
        console.error('Failed to load dashboards:', err)
        toast.error('Failed to load dashboards')
      })
    }
  }, [currentConnectionId, loadDashboards])

  const handleCreateDashboard = async () => {
    if (!currentConnectionId) {
      toast.error('No connection selected')
      return
    }

    setIsCreating(true)
    try {
      const newDashboard = await createDashboard(
        currentConnectionId,
        `Dashboard ${dashboards.length + 1}`
      )
      // Reload dashboards to get updated list
      await loadDashboards(currentConnectionId)
      setCurrentDashboard(newDashboard)
      setDashboardSheetOpen(false)
      toast.success('Dashboard created')
    } catch (err) {
      console.error('Failed to create dashboard:', err)
      toast.error('Failed to create dashboard')
    } finally {
      setIsCreating(false)
    }
  }

  const handleSelectDashboard = (dashboard: typeof dashboards[0]) => {
    setCurrentDashboard(dashboard)
    setDashboardSheetOpen(false)
  }

  return (
    <div className="bg-main-sidebar backdrop-blur py-2">
      <div className="px-2 h-full flex flex-col items-center justify-between">
        <div className="flex flex-col gap-2 items-center">
          <QuickPanel />
          {currentConnectionId && (
            <Sheet open={dashboardSheetOpen} onOpenChange={setDashboardSheetOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <LayoutDashboard className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                </TooltipTrigger>
                <TooltipContent side="right">Dashboards</TooltipContent>
              </Tooltip>
              <SheetContent side="left" className="w-[320px]">
                <SheetHeader>
                  <SheetTitle>Dashboards</SheetTitle>
                  <SheetDescription>
                    Create and manage your data dashboards
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-4 space-y-2! px-4">
                  <Button
                    variant="outline"
                    className="w-full justify-start cursor-pointer"
                    onClick={handleCreateDashboard}
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2!" />
                    )}
                    {isCreating ? 'Creating...' : 'New Dashboard'}
                  </Button>
                  {dashboards.length > 0 && (
                    <div className="mt-4 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground px-2 py-1">
                        Your Dashboards
                      </p>
                      {dashboards.map((dashboard) => (
                        <button
                          key={dashboard.dashboardId}
                          className="w-full text-left! px-3 py-2 text-sm rounded-md hover:bg-accent cursor-pointer"
                          onClick={() => handleSelectDashboard(dashboard)}
                        >
                          <div className="font-medium">{dashboard.name}</div>
                          {dashboard.description && (
                            <div className="text-xs text-muted-foreground truncate">
                              {dashboard.description}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {dashboard.widgets.length} widget{dashboard.widgets.length !== 1 ? 's' : ''}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {dashboards.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4 whitespace-pre-line">
                      {`No dashboards yet... \n Create your first one!`}
                    </p>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
        <div className="flex flex-col gap-2 items-center">
          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}
