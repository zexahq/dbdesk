import { create } from 'zustand'

type Theme = 'light' | 'dark'

interface ThemeStore {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

// Initialize theme from localStorage or system preference
const getInitialTheme = (): Theme => {
  // Check localStorage first
  const stored = localStorage.getItem('theme') as Theme | null
  if (stored === 'light' || stored === 'dark') {
    return stored
  }
  // Fallback to system preference
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

// Update DOM classes based on theme
const updateDOMTheme = (theme: Theme) => {
  const root = document.documentElement
  const body = document.body

  if (theme === 'dark') {
    body.classList.add('dark')
    root.classList.add('dark')
  } else {
    body.classList.remove('dark')
    root.classList.remove('dark')
  }
}

// Initialize DOM on store creation
const initialTheme = getInitialTheme()
updateDOMTheme(initialTheme)

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: initialTheme,

  setTheme: (theme: Theme) => {
    set({ theme })
    localStorage.setItem('theme', theme)
    updateDOMTheme(theme)
  },

  toggleTheme: () => {
    set((state) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light'
      localStorage.setItem('theme', newTheme)
      updateDOMTheme(newTheme)
      return { theme: newTheme }
    })
  }
}))
