import { Loader2, LogOut, Moon, Sun } from 'lucide-react'
import { authClient, fullSignOut } from '@renderer/lib/auth'
import { useTheme } from '@renderer/hooks/use-theme'
import { Avatar, AvatarFallback, AvatarImage } from '@renderer/components/ui/avatar'
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
  const { data, isPending } = authClient.useSession()
  const { theme, toggleTheme } = useTheme()

  const user = data?.user

  if (!user) return null

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <button className="flex items-center justify-center rounded-lg p-1 hover:bg-accent cursor-pointer">
            <Avatar className="size-6">
              <AvatarImage src={user.image ?? undefined} alt={user.name} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
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
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={toggleTheme}>
            {theme === 'light' ? <Moon className="size-4" /> : <Sun className="size-4" />}
            {theme === 'light' ? 'Dark' : 'Light'} Mode
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={fullSignOut}>
          <LogOut className="size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
