// Android's back button (and back gesture) does exactly what the screen's
// own back button does, never something else. Screens whose on-screen way
// back isn't a plain "go back" (combat: pause; the overworld: LEAVE AREA)
// give their own action with useBackButton; App's default (backDefault)
// ignores back on the home tabs and setup screens and lets every other
// screen go back as its back button does. iOS has no swipe-back
// (gestureEnabled: false in App.tsx).
import { useFocusEffect } from '@react-navigation/native'
import { useCallback, useRef } from 'react'
import { BackHandler } from 'react-native'

/** Screens where back does nothing: the tabs (home) and first-run setup. */
export const NO_BACK_ROUTES = new Set([
  'Title',
  'ClassSelect',
  'Camp',
  'Quests',
  'Hero',
  'Map',
])

/** App's fallback: true (handled, nothing happens) on NO_BACK_ROUTES. */
export const backDefault = (route: string | undefined) =>
  route !== undefined && NO_BACK_ROUTES.has(route)

/** While this screen is focused, Android back runs `action` instead. */
export function useBackButton(action: () => void) {
  const ref = useRef(action)
  ref.current = action
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        ref.current()
        return true
      })
      return () => sub.remove()
    }, [])
  )
}
