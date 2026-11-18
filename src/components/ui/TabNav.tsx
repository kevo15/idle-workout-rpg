/**
 * Bottom tab bar from the mockups: solid floor, 3px crimson marker on the
 * active tab. Fills the box Screen places it in (`tab` prop); `compact` is the
 * shorter landscape bar.
 */
import { goTab, useNav } from '../../navigation/useNav'
import type { TabRoute } from '../../navigation/types'
import { Pressable, View } from 'react-native'

import { C } from '../../theme/tokens'

import { Icon, type IconName } from './Icon'
import { T } from './Text'

export type TabKey = 'camp' | 'quests' | 'hero' | 'map'

const TABS: { key: TabKey; label: string; icon: IconName; route: TabRoute }[] =
  [
    { key: 'camp', label: 'CAMP', icon: 'dumbbell', route: 'Camp' },
    { key: 'quests', label: 'QUESTS', icon: 'swords', route: 'Quests' },
    { key: 'hero', label: 'HERO', icon: 'shield', route: 'Hero' },
    { key: 'map', label: 'MAP', icon: 'map', route: 'Map' },
  ]

export function TabNav({
  active,
  compact,
  onReselect,
}: {
  active: TabKey
  compact?: boolean
  /** Tapping the active tab (e.g. MAP from an overworld: back to area select). */
  onReselect?: () => void
}) {
  const nav = useNav()
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flex: 1,
        paddingHorizontal: 8,
        paddingBottom: compact ? 0 : 20,
        flexDirection: 'row',
        backgroundColor: C.floor,
        borderTopWidth: 1,
        borderTopColor: C.steel,
      }}
    >
      {TABS.map((t) => {
        const on = t.key === active
        const color = on ? C.chalk : C.steelLight
        return (
          <Pressable
            key={t.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => (on ? onReselect?.() : goTab(nav, t.route))}
            style={{
              flex: 1,
              flexDirection: compact ? 'row' : 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: compact ? 8 : 4,
              borderTopWidth: 3,
              borderTopColor: on ? C.crimson : 'transparent',
            }}
          >
            <Icon name={t.icon} size={compact ? 20 : 22} color={color} />
            <T f="body700" size={compact ? 12 : 11} ls={0.08} color={color}>
              {t.label}
            </T>
          </Pressable>
        )
      })}
    </View>
  )
}
