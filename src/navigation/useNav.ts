import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import type { RootStackParamList, TabRoute } from './types'

export type Nav = NativeStackNavigationProp<RootStackParamList>

export const useNav = () => useNavigation<Nav>()

/** Switch tabs without growing the stack (tab screens have no transition). */
export function goTab(nav: Nav, route: TabRoute) {
  nav.replace(route)
}
