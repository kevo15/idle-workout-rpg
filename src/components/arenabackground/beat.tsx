/**
 * One shared beat clock drives every animated layer (docs/ui-theme.md §5).
 *
 * `beats` counts up linearly from 0 to CYCLE beats, then restarts. CYCLE is a
 * common multiple of every keyframe period used in the mockups (1, 2, 4, 8, 12),
 * so every loop stays seamless across the restart.
 */
import { useFocusEffect } from '@react-navigation/native'
import { createContext, useCallback, useContext, type ReactNode } from 'react'
import {
  cancelAnimation,
  Easing,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'

export const CYCLE = 24

const BeatContext = createContext<SharedValue<number> | null>(null)

export function BeatProvider({
  bpm,
  children,
}: {
  bpm: number
  children: ReactNode
}) {
  const beats = useSharedValue(0)
  const reduced = useReducedMotion()

  useFocusEffect(
    useCallback(() => {
      cancelAnimation(beats)
      beats.value = 0
      if (reduced) return
      const beatMs = 60000 / bpm
      beats.value = withRepeat(
        withTiming(CYCLE, { duration: beatMs * CYCLE, easing: Easing.linear }),
        -1,
        false
      )
      return () => cancelAnimation(beats)
    }, [bpm, reduced, beats])
  )

  return <BeatContext.Provider value={beats}>{children}</BeatContext.Provider>
}

export function useBeats(): SharedValue<number> {
  const v = useContext(BeatContext)
  if (!v) throw new Error('useBeats must be used inside <BeatProvider>')
  return v
}
