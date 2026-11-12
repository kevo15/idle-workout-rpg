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
import { DarkTheme, NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import React, { useEffect, useState } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

import { RootStackParamList } from './src/navigation/types'
import CampScreen from './src/screens/CampScreen'
import ClassSelectScreen from './src/screens/ClassSelectScreen'
import HeroScreen from './src/screens/HeroScreen'
import MapScreen from './src/screens/MapScreen'
import PlanScreen from './src/screens/PlanScreen'
import QuestsScreen from './src/screens/QuestsScreen'
import ReplayLogScreen from './src/screens/ReplayLogScreen'
import ReplayScreen from './src/screens/ReplayScreen'
import TitleScreen from './src/screens/TitleScreen'
import WorkoutScreen from './src/screens/WorkoutScreen'
import { useCamp } from './src/state/useCamp'
import { useDayRollover, useHero } from './src/state/useHero'
import { C } from './src/theme/tokens'

SplashScreen.preventAutoHideAsync()

const Stack = createNativeStackNavigator<RootStackParamList>()

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

  const ready = fontsLoaded && hydrated && campLoaded
  useEffect(() => {
    if (ready) SplashScreen.hideAsync()
  }, [ready])

  if (!ready) return null

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.floorDeep }}>
      <StatusBar style="light" />
      <NavigationContainer theme={theme}>
        <Stack.Navigator
          initialRouteName="Title"
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            contentStyle: { backgroundColor: C.floorDeep },
          }}
        >
          <Stack.Screen name="Title" component={TitleScreen} />
          <Stack.Screen name="ClassSelect" component={ClassSelectScreen} />
          <Stack.Screen name="Camp" component={CampScreen} options={TAB} />
          <Stack.Screen name="Quests" component={QuestsScreen} options={TAB} />
          <Stack.Screen name="Hero" component={HeroScreen} options={TAB} />
          <Stack.Screen name="Map" component={MapScreen} options={TAB} />
          <Stack.Screen
            name="Workout"
            component={WorkoutScreen}
            options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
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
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  )
}
