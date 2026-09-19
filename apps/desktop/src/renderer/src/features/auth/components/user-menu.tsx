import { UpdateMenuItems } from '@renderer/components/shell/update-menu-items'
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from '@renderer/components/ui/avatar'
import { Button } from '@renderer/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { fullSignOut } from '@renderer/features/auth/lib/auth'
import { requestSignIn } from '@renderer/features/auth/lib/auth-utils'
import { useAuthStore } from '@renderer/features/auth/stores/auth-store'
import { useSettingsStore } from '@renderer/features/settings/stores/settings-store'
import { useTheme } from '@renderer/shared/hooks/use-theme'
import { useUpdateState } from '@renderer/shared/hooks/use-update-state'
import { useNavigate } from '@tanstack/react-router'
import { CircleAlert, Loader2, LogIn, LogOut, Moon, Settings, Sun } from 'lucide-react'

export function UserMenu() {
  const { user, isLoading } = useAuthStore()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const updateState = useUpdateState()

  if (!user) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Sign in"
            className="h-8 w-8 cursor-pointer"
            onClick={() => void requestSignIn().catch(console.error)}
          >
            <LogIn aria-hidden="true" className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Sign in (optional)</TooltipContent>
      </Tooltip>
    )
  }

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  const handleLogout = async () => {
    await fullSignOut()
    navigate({ to: '/auth' })
  }

  const showBadge = ['available', 'downloading', 'downloaded', 'error'].includes(updateState.status)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {isLoading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <button
            type="button"
            aria-label="Open User Menu"
            className="relative flex items-center justify-center rounded-lg p-1 hover:bg-accent cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Avatar size="sm">
              <AvatarImage src={user.image ?? undefined} alt={user.name} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            {showBadge && (
              <AvatarBadge className="bg-primary">
                <CircleAlert aria-hidden="true" className="size-2 fill-current" />
              </AvatarBadge>
            )}
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 rounded-lg" side="right" align="end" sideOffset={4}>
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar className="size-8">
              <AvatarImage src={user.image ?? undefined} alt={user.name} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs">{user.email}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <UpdateMenuItems />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => useSettingsStore.getState().openSettings()}>
            <Settings className="size-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={toggleTheme}>
            {theme === 'light' ? <Moon className="size-4" /> : <Sun className="size-4" />}
            {theme === 'light' ? 'Dark' : 'Light'} Mode
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
