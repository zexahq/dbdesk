import { create } from 'zustand'

export type SettingsSection = 'cli' | 'updates' | 'about'

interface SettingsStore {
  open: boolean
  section: SettingsSection
  openSettings: (section?: SettingsSection) => void
  closeSettings: () => void
  setSection: (section: SettingsSection) => void
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  open: false,
  section: 'cli',
  openSettings: (section) => set((state) => ({ open: true, section: section ?? state.section })),
  closeSettings: () => set({ open: false }),
  setSection: (section) => set({ section })
}))
