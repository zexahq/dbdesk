import { CircleAlert, Loader2, LogOut, Moon, Settings, Sun } from 'lucide-react'
import { fullSignOut } from '@renderer/features/auth/lib/auth'
import { useSettingsStore } from '@renderer/features/settings/stores/settings-store'
import { useTheme } from '@renderer/shared/hooks/use-theme'
import { useUpdateState } from '@renderer/shared/hooks/use-update-state'
import { UpdateMenuItems } from '@renderer/components/shell/update-menu-items'
import { useAuthStore } from '@renderer/features/auth/stores/auth-store'
import { useNavigate } from '@tanstack/react-router'
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from '@renderer/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'

export function UserMenu() {
  const { user, isLoading } = useAuthStore()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const updateState = useUpdateState()

  if (!user) return null

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  const handleLogout = async () => {
    await fullSignOut()
    navigate({ to: '/auth' })
  }

  const showBadge = updateState.status !== 'idle'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {isLoading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <button className="relative flex items-center justify-center rounded-lg p-1 hover:bg-accent cursor-pointer">
            <Avatar size="sm">
              <AvatarImage src={user.image ?? undefined} alt={user.name} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            {showBadge && (
              <AvatarBadge className="bg-primary">
                <CircleAlert className="size-2 fill-current" />
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
