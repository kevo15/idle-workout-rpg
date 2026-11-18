import 'react-native-gesture-handler'
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter'
import { LilitaOne_400Regular } from '@expo-google-fonts/lilita-one'
import { Teko_500Medium, Teko_600SemiBold } from '@expo-google-fonts/teko'
import {
  createNavigationContainerRef,
  DarkTheme,
  NavigationContainer,
} from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useFonts } from 'expo-font'
import * as ScreenOrientation from 'expo-screen-orientation'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import React, { useEffect, useState } from 'react'
import { BackHandler } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { RootStackParamList } from './src/navigation/types'
import { backDefault } from './src/navigation/useBack'
import CampScreen from './src/screens/CampScreen'
import FightScreen from './src/screens/FightScreen'
import ClassSelectScreen from './src/screens/ClassSelectScreen'
import HeroScreen from './src/screens/HeroScreen'
import MapScreen from './src/screens/MapScreen'
import OverworldScreen from './src/screens/OverworldScreen'
import PlanScreen from './src/screens/PlanScreen'
import QuestPlanScreen from './src/screens/QuestPlanScreen'
import QuestsScreen from './src/screens/QuestsScreen'
import ReplayLogScreen from './src/screens/ReplayLogScreen'
import ReplayScreen from './src/screens/ReplayScreen'
import SettingsScreen from './src/screens/SettingsScreen'
import TitleScreen from './src/screens/TitleScreen'
import WorkoutScreen from './src/screens/WorkoutScreen'
import WorkoutsScreen from './src/screens/WorkoutsScreen'
import { useCamp } from './src/state/useCamp'
import { useDayRollover, useHero } from './src/state/useHero'
import { isLandscapeRoute, useSettings } from './src/state/useSettings'
import { C } from './src/theme/tokens'

SplashScreen.preventAutoHideAsync()

const Stack = createNativeStackNavigator<RootStackParamList>()
const navRef = createNavigationContainerRef<RootStackParamList>()

/**
 * The route whose orientation applies: the current one, except Settings,
 * which keeps the screen it was opened from (so pausing a landscape fight
 * to change a setting doesn't spin the phone to portrait).
 */
function orientationRoute(): string | undefined {
  if (!navRef.isReady()) return undefined
  const state = navRef.getRootState()
  if (!state) return undefined
  let i = state.index ?? state.routes.length - 1
  if (state.routes[i]?.name === 'Settings' && i > 0) i--
  return state.routes[i]?.name
}

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: C.floorDeep },
}

/** Tab screens draw their own TabNav, so switching between them is instant. */
const TAB = { animation: 'none' } as const

export default function App() {
  const [fontsLoaded] = useFonts({
    LilitaOne_400Regular,
    Teko_500Medium,
    Teko_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  })

  // Wait for the saved hero too, so screens never flash default data
  const hydrated = useHero((s) => s.hydrated)
  useDayRollover()

  const [campLoaded, setCampLoaded] = useState(() =>
    useCamp.persist.hasHydrated()
  )
  useEffect(
    () => useCamp.persist.onFinishHydration(() => setCampLoaded(true)),
    []
  )

  const [settingsLoaded, setSettingsLoaded] = useState(() =>
    useSettings.persist.hasHydrated()
  )
  useEffect(
    () => useSettings.persist.onFinishHydration(() => setSettingsLoaded(true)),
    []
  )

  // Combat and the overworld follow the orientation setting; every other
  // screen is portrait
  const orientation = useSettings((s) => s.orientation)
  const [route, setRoute] = useState<string | undefined>()
  const landscape = isLandscapeRoute(route, orientation)
  useEffect(() => {
    if (!settingsLoaded) return
    ScreenOrientation.lockAsync(
      landscape
        ? ScreenOrientation.OrientationLock.LANDSCAPE
        : ScreenOrientation.OrientationLock.PORTRAIT_UP
    ).catch(() => {})
  }, [landscape, settingsLoaded])

  const ready = fontsLoaded && hydrated && campLoaded && settingsLoaded
  useEffect(() => {
    if (ready) SplashScreen.hideAsync()
  }, [ready])

  // Android back: nothing on the home tabs and setup screens; elsewhere it
  // goes back like the screen's own back button (screens with a different
  // way back override it: src/navigation/useBack.ts). Registered once the
  // navigator is up, so it runs before the navigator's own handler.
  useEffect(() => {
    if (!ready) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () =>
      backDefault(navRef.isReady() ? navRef.getCurrentRoute()?.name : undefined)
    )
    return () => sub.remove()
  }, [ready])

  if (!ready) return null

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.floorDeep }}>
      <StatusBar style="light" />
      <SafeAreaProvider>
        <NavigationContainer
          ref={navRef}
          theme={theme}
          onReady={() => setRoute(orientationRoute())}
          onStateChange={() => setRoute(orientationRoute())}
        >
          <Stack.Navigator
            initialRouteName="Title"
            screenOptions={{
              headerShown: false,
              animation: 'fade',
              // No swipe-back: every screen leaves by its own buttons
              // (Android's back button does the same, src/navigation/useBack.ts)
              gestureEnabled: false,
              contentStyle: { backgroundColor: C.floorDeep },
            }}
          >
            <Stack.Screen name="Title" component={TitleScreen} />
            <Stack.Screen name="ClassSelect" component={ClassSelectScreen} />
            <Stack.Screen name="Camp" component={CampScreen} options={TAB} />
            <Stack.Screen
              name="Quests"
              component={QuestsScreen}
              options={TAB}
            />
            <Stack.Screen name="Hero" component={HeroScreen} options={TAB} />
            <Stack.Screen name="Map" component={MapScreen} options={TAB} />
            <Stack.Screen
              name="Overworld"
              component={OverworldScreen}
              options={{ animation: 'fade' }}
            />
            <Stack.Screen
              name="Workout"
              component={WorkoutScreen}
              options={{
                animation: 'slide_from_bottom',
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="Plan"
              component={PlanScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="ReplayLog"
              component={ReplayLogScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="Replay"
              component={ReplayScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="QuestPlan"
              component={QuestPlanScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="Workouts"
              component={WorkoutsScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="Fight"
              component={FightScreen}
              options={{ animation: 'fade', gestureEnabled: false }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{
                // Over whatever opened it: a centred card in landscape
                presentation: 'transparentModal',
                animation: 'fade',
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
