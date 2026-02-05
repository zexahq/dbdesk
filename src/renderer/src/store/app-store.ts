import { create } from 'zustand'

interface AppStore {
  isOnline: boolean
  setIsOnline: (isOnline: boolean) => void
}

export const useAppStore = create<AppStore>((set) => ({
  isOnline: true,
  setIsOnline: (isOnline) => set({ isOnline })
}))

window.addEventListener('online', () => {
  useAppStore.getState().setIsOnline(true)
})

window.addEventListener('offline', () => {
  useAppStore.getState().setIsOnline(false)
})
