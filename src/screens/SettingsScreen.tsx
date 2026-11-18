/**
 * Settings: battle and overworld orientation for now. Opened from the gear on
 * every header (and the Title and overworld). Every other screen stays
 * portrait (src/state/useSettings.ts).
 */
import { Pressable, ScrollView, View } from 'react-native'

import {
  Screen,
  ScreenBody,
  useLandscape,
} from '../components/arenabackground/Screen'
import { H, Header, Icon, IconButton, Panel, T } from '../components/ui'
import { useNav } from '../navigation/useNav'
import { useSettings, type Orientation } from '../state/useSettings'
import { C } from '../theme/tokens'

const CHOICES: { id: Orientation; label: string; desc: string }[] = [
  {
    id: 'portrait',
    label: 'PORTRAIT',
    desc: 'Battles and the Map stay upright, like the rest of the game.',
  },
  {
    id: 'landscape',
    label: 'LANDSCAPE',
    desc: 'Turn the phone sideways for battles and the Map. Other screens stay upright.',
  },
]

/** A phone outline, upright or on its side. */
function PhoneGlyph({ wide, color }: { wide: boolean; color: string }) {
  return (
    <View
      style={{
        width: wide ? 34 : 20,
        height: wide ? 20 : 34,
        borderRadius: 5,
        borderWidth: 2.5,
        borderColor: color,
      }}
    />
  )
}

/** The battles-and-map orientation choice. */
function OrientationPanel() {
  const orientation = useSettings((s) => s.orientation)
  const setOrientation = useSettings((s) => s.setOrientation)
  return (
    <Panel label="BATTLES & MAP">
      <View accessibilityRole="radiogroup" style={{ padding: 14, gap: 10 }}>
        {CHOICES.map((c) => {
          const on = c.id === orientation
          return (
            <Pressable
              key={c.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={c.label}
              onPress={() => setOrientation(c.id)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                minHeight: 64,
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: on ? C.deepRed : C.iron,
                borderWidth: on ? 2 : 1.5,
                borderColor: on ? C.gold : C.steel,
              }}
            >
              <View style={{ width: 36, alignItems: 'center' }}>
                <PhoneGlyph
                  wide={c.id === 'landscape'}
                  color={on ? C.gold : C.mist}
                />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <H size={20} skewLeft>
                  {c.label}
                </H>
                <T size={12} lh={1.4} color={C.mist}>
                  {c.desc}
                </T>
              </View>
              {on ? <Icon name="check" size={20} color={C.gold} /> : null}
            </Pressable>
          )
        })}
      </View>
    </Panel>
  )
}

export default function SettingsScreen() {
  const nav = useNav()
  const landscape = useLandscape()

  // Landscape: a card in the middle of the screen, over whatever opened it
  if (landscape)
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close settings"
        onPress={() => nav.goBack()}
        style={{
          flex: 1,
          backgroundColor: 'rgba(11,11,13,0.82)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            width: 420,
            maxWidth: '100%',
            maxHeight: '100%',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: C.gold,
            backgroundColor: C.floor,
            padding: 14,
            gap: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <H size={28} lh={1} skew style={{ flex: 1 }}>
              SETTINGS
            </H>
            <IconButton
              icon="x"
              label="Close"
              strokeWidth={2.2}
              onPress={() => nav.goBack()}
            />
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <OrientationPanel />
          </ScrollView>
        </Pressable>
      </Pressable>
    )

  return (
    <Screen
      bpm={70}
      glow={{ cx: 0.5, cy: 0.2, rx: 0.8, ry: 0.3, opacity: 0.18 }}
      split={104}
    >
      <Header padLeft={16} gap={12} settings={false}>
        <IconButton
          icon="x"
          label="Close"
          strokeWidth={2.2}
          onPress={() => nav.goBack()}
        />
        <H size={32} lh={1} skew style={{ flex: 1, marginBottom: 4 }}>
          SETTINGS
        </H>
      </Header>
      <ScreenBody style={{ padding: 16, paddingBottom: 32, gap: 12 }}>
        <OrientationPanel />
      </ScreenBody>
    </Screen>
  )
}
