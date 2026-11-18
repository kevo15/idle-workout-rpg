/** Choose your class — docs/mockups/class.html (main stage, 110 BPM). */
import { CLASSES, CLASS_ORDER, type ClassId } from '../../rpg/classes'
import { useNav } from '../navigation/useNav'
import { useState } from 'react'

import { useCamp } from '../state/useCamp'
import { useHero } from '../state/useHero'
import { Alert, Pressable, View } from 'react-native'
import { G, Path, Rect } from 'react-native-svg'

import { CLASS_ICON, Icon } from '../components/ui/Icon'
import {
  Scrim,
  SceneSvg,
  Screen,
  ScreenBody,
} from '../components/arenabackground/Screen'
import {
  BarbellBar,
  Card,
  GoldButton,
  Header,
  HeaderTitle,
  Ribbon,
  N,
  T,
  TapeTag,
} from '../components/ui'
import {
  CrowdRow,
  FlexFigure,
  FloorShapes,
  Floodlight,
  SHIELD_PATH,
} from '../components/arenabackground/parts'
import { C, STAT_COLOR, type StatKey } from '../theme/tokens'

function Stage() {
  return (
    <>
      <SceneSvg>
        <Rect x={0} y={150} width={390} height={18} fill="#17181C" />
        <Rect x={0} y={168} width={390} height={18} fill="#1A1B20" />
        <Rect x={0} y={186} width={390} height={18} fill="#1D1E23" />
      </SceneSvg>
      <CrowdRow x1={8} x2={384} y={146} />
      <CrowdRow x1={3} x2={388} y={164} offset={0.5} />
      <CrowdRow x1={8} x2={384} y={182} />
      <Floodlight
        lamp={[6, 104, 30, 8]}
        beam={[
          [14, 112],
          [30, 112],
          [230, 300],
          [160, 300],
        ]}
        topOpacity={0.26}
        bottomOpacity={0.02}
        pivot={[6, 104]}
        swing={{ name: 'sway', period: 8 }}
      />
      <Floodlight
        lamp={[354, 104, 30, 8]}
        beam={[
          [360, 112],
          [376, 112],
          [230, 300],
          [160, 300],
        ]}
        topOpacity={0.26}
        bottomOpacity={0.02}
        pivot={[384, 104]}
        swing={{ name: 'sway', period: 8, reverse: true }}
      />
      <SceneSvg>
        <FloorShapes y={330} />
        <G transform="translate(140 176)">
          <Path
            d={SHIELD_PATH}
            fill={C.crimson}
            stroke={C.gold}
            strokeWidth={4}
            strokeLinejoin="round"
          />
        </G>
      </SceneSvg>
      <FlexFigure x={320} y={330} />
    </>
  )
}

export default function ClassSelect() {
  const nav = useNav()
  const saved = useHero((s) => s.classId)
  const pickClass = useHero((s) => s.pickClass)
  const restart = useHero((s) => s.restart)
  const startOver = useCamp((s) => s.startOver)
  const [cur, setCur] = useState<ClassId>(saved ?? 'warrior')
  const c = CLASSES[cur]
  // The class is locked once chosen: picking another starts a new hero
  const switching = saved !== null && cur !== saved

  const choose = () => {
    // The game opens on Hero: stats, class level and the way to the Map
    const toHero = () => nav.reset({ index: 0, routes: [{ name: 'Hero' }] })
    if (!saved) {
      pickClass(cur)
      toHero()
      return
    }
    if (!switching) {
      nav.goBack()
      return
    }
    Alert.alert(
      `Start over as ${c.name.toLowerCase()}?`,
      `Your hero is locked to ${CLASSES[saved].name.toLowerCase()}. Switching starts a new hero: stats reset to the ${c.name.toLowerCase()} base, quest history clears, and your gold, unlocked areas, story scenes, replays and any expedition out now are lost. This can't be undone.`,
      [
        { text: 'Keep my hero', style: 'cancel' },
        {
          text: 'Start over',
          style: 'destructive',
          onPress: () => {
            restart(cur)
            startOver()
            toHero()
          },
        },
      ]
    )
  }

  const tag = !saved
    ? 'AVAILABLE AT LAUNCH'
    : switching
      ? 'NEW HERO'
      : 'YOUR CLASS'
  const button = !saved
    ? `CHOOSE ${c.name}`
    : switching
      ? `START OVER AS ${c.name}`
      : `KEEP ${c.name}`
  return (
    <Screen
      split={344}
      bpm={110}
      glow={{ cx: 0.5, cy: 0.28, rx: 0.8, ry: 0.4, opacity: 0.26 }}
    >
      <Stage />
      <View
        pointerEvents="none"
        style={{ position: 'absolute', left: 167, top: 206 }}
      >
        <Icon name={CLASS_ICON[cur].big} size={56} />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 290,
          alignItems: 'center',
        }}
      >
        <Ribbon label={c.name} />
      </View>
      <Scrim top={326} solidAt={0.1} />

      <Header>
        <HeaderTitle size={30}>CHOOSE YOUR CLASS</HeaderTitle>
      </Header>

      <ScreenBody style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}>
        <View
          accessibilityRole="radiogroup"
          style={{ flexDirection: 'row', gap: 6 }}
        >
          {CLASS_ORDER.map((id) => {
            const k = CLASSES[id]
            const locked = !k.playable
            const on = id === cur
            const fg = on ? C.chalk : locked ? C.steelLight : C.chalk
            return (
              <Pressable
                key={id}
                accessibilityRole="radio"
                accessibilityState={{ selected: on, disabled: locked }}
                accessibilityLabel={locked ? `${k.name}, coming soon` : k.name}
                disabled={locked}
                onPress={() => setCur(id)}
                style={{
                  flex: 1,
                  height: 80,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  backgroundColor: on ? C.crimson : locked ? C.floor : C.iron,
                  borderWidth: on ? 2 : 1.5,
                  borderColor: on ? C.gold : C.steel,
                  borderStyle: locked ? 'dashed' : 'solid',
                }}
              >
                {locked ? null : (
                  <Icon name={CLASS_ICON[id].small} size={24} color={fg} />
                )}
                {locked ? <Icon name="lock" size={20} color={fg} /> : null}
                <T f="body800" size={10} ls={0.06} color={fg}>
                  {k.short}
                </T>
              </Pressable>
            )
          })}
        </View>

        <Card featured style={{ gap: 10 }}>
          <TapeTag label={tag} />
          <T size={14} lh={1.45}>
            {c.desc}
          </T>
          <View style={{ gap: 4 }}>
            <T size={13} color={C.mist}>
              <T f="body700" size={13} color={C.gold}>
                Workouts:
              </T>{' '}
              {c.workoutTheme}
            </T>
            <T size={13} color={C.mist}>
              <T f="body700" size={13} color={C.gold}>
                In battle:
              </T>{' '}
              {c.fightStyle}
            </T>
          </View>
          <View style={{ gap: 6 }}>
            {(['STR', 'END', 'AGI', 'VIT'] as StatKey[]).map((s) => (
              <View
                key={s}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
              >
                <T f="body700" size={11} ls={0.1} style={{ width: 32 }}>
                  {s}
                </T>
                <BarbellBar
                  big={false}
                  segments={[[c.baseStats[s] / 10, STAT_COLOR[s]]]}
                />
                <N size={20} lh={1} align="right" style={{ width: 22 }}>
                  {c.baseStats[s]}
                </N>
              </View>
            ))}
          </View>
          {switching ? (
            <T size={12} lh={1.4} color={C.hype}>
              Your class is locked. Switching starts a new hero at these base
              stats; training, history and class level reset.
            </T>
          ) : null}
        </Card>

        <GoldButton
          label={button}
          height={56}
          fontSize={switching ? 19 : 21}
          trackWidth={360}
          onPress={choose}
        />
      </ScreenBody>
    </Screen>
  )
}
