import { useThemeStore } from '@renderer/store/theme-store'

export function useTheme() {
  const theme = useThemeStore((state) => state.theme)
  const setTheme = useThemeStore((state) => state.setTheme)
  const toggleTheme = useThemeStore((state) => state.toggleTheme)

  return { theme, setTheme, toggleTheme }
}
