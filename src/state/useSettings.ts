// Player settings, saved on the device. The orientation setting applies to
// combat and the overworld only (LANDSCAPE_ROUTES); App.tsx locks every other
// screen to portrait.

import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type Orientation = 'portrait' | 'landscape'

interface SettingsData {
  orientation: Orientation
}

type SettingsStore = SettingsData & {
  setOrientation: (o: Orientation) => void
}

const DEFAULTS: SettingsData = { orientation: 'portrait' }

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setOrientation: (orientation) => set({ orientation }),
    }),
    {
      name: 'rep-raiders/settings',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ orientation }) => ({ orientation }),
    }
  )
)

/** Screens that follow the orientation setting: combat and the overworld. */
export const LANDSCAPE_ROUTES: readonly string[] = [
  'Replay',
  'Overworld',
  'Fight',
]

export const isLandscapeRoute = (
  route: string | undefined,
  orientation: Orientation
) =>
  orientation === 'landscape' &&
  route !== undefined &&
  LANDSCAPE_ROUTES.includes(route)
