/**
 * YOUR CALL: plan the next expedition (docs/game-flow.md §6.3). Pick an
 * approach relative to your class level, optionally warm up first, then
 * start. Scene: the arena gate (docs/mockups/expedition.html).
 */
import { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'

import { getExercise } from '../../rpg/exercises'
import {
  APPROACHES,
  EXPEDITION_HOURS,
  WARMUP_EXERCISE,
  WARMUP_GOLD_BONUS,
  WARMUP_WIN_BONUS,
  approachInfo,
  enemyLevel,
  type Approach,
} from '../../rpg/expedition'
import { levelInfo } from '../../rpg/progress'
import { getCampSite, regionOf } from '../../rpg/world'
import { ArenaGate } from '../components/arenabackground/ArenaGate'
import { Screen } from '../components/arenabackground/Screen'
import {
  Card,
  CrimsonButton,
  GoldButton,
  H,
  Header,
  Icon,
  IconButton,
  N,
  Panel,
  PlateRing,
  T,
  TapeTag,
} from '../components/ui'
import { useNav } from '../navigation/useNav'
import { useCamp } from '../state/useCamp'
import { useHero } from '../state/useHero'
import { C, SKEW } from '../theme/tokens'

const pct = (x: number) => `${Math.round(x * 100)}%`

export default function PlanScreen() {
  const nav = useNav()
  const level = useHero((s) => levelInfo(s.stats).level)
  const classId = useHero((s) => s.classId) ?? 'warrior'
  const site = getCampSite(useCamp((s) => s.siteId))
  const running = useCamp((s) => s.current !== null)
  const warmedUp = useCamp((s) => s.warmupReady)
  const start = useCamp((s) => s.start)
  const [approach, setApproach] = useState<Approach>('BALANCED')

  const info = approachInfo(approach)
  const foeLevel = enemyLevel(level, site, approach)
  const warmup = getExercise(WARMUP_EXERCISE[classId] ?? 'squats')

  const go = () => {
    if (start(approach, level)) nav.goBack()
  }

  return (
    <Screen bpm={120}>
      <ArenaGate />
      <Header padLeft={16} gap={12}>
        <IconButton
          icon="x"
          label="Close"
          strokeWidth={2.2}
          onPress={() => nav.goBack()}
        />
        <H size={32} lh={1} skew style={{ flex: 1, marginBottom: 4 }}>
          YOUR CALL
        </H>
        <N size={26} lh={1} color={C.steelLight}>
          LV{' '}
          <N size={26} color={C.chalk}>
            {level}
          </N>
        </N>
      </Header>

      <View
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          top: 116,
          flexDirection: 'row',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <TapeTag label={`CAMP · ${site.name.toUpperCase()}`} />
        <TapeTag
          label={`LEVELS ${site.levelBand[0]}–${site.levelBand[1]}`}
          tilt={2}
        />
      </View>

      <ScrollView
        style={{ position: 'absolute', left: 0, right: 0, top: 394, bottom: 0 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 32,
          gap: 10,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Card featured style={{ gap: 6 }}>
          <H size={18} skewLeft>
            {regionOf(site).name.toUpperCase()}
          </H>
          <T size={13} lh={1.5} color={C.mist}>
            {site.enemies.join(', ')}.{' '}
            <T f="body700" size={13} color={C.gold}>
              Boss:
            </T>{' '}
            the {site.boss}.
          </T>
        </Card>

        <Panel label="APPROACH" right={`Runs up to ${EXPEDITION_HOURS} hours`}>
          <View style={{ padding: 12, paddingHorizontal: 14, gap: 10 }}>
            <View
              accessibilityRole="radiogroup"
              style={{ flexDirection: 'row', gap: 6 }}
            >
              {APPROACHES.map((a) => {
                const on = a.id === approach
                return (
                  <Pressable
                    key={a.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    onPress={() => setApproach(a.id)}
                    style={{
                      flex: 1,
                      height: 52,
                      borderRadius: 8,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: on ? C.crimson : C.floor,
                      borderWidth: 1.5,
                      borderColor: on ? C.crimson : C.steel,
                      paddingHorizontal: 6,
                      transform: [{ skewX: SKEW }],
                    }}
                  >
                    <T f="display" size={13} fit color={on ? C.chalk : C.mist}>
                      {a.label}
                    </T>
                    <T
                      f="body700"
                      size={10}
                      ls={0.1}
                      color={on ? C.chalk : C.steelLight}
                    >
                      ENEMY LV {enemyLevel(level, site, a.id)}
                    </T>
                  </Pressable>
                )
              })}
            </View>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
            >
              <PlateRing
                size={52}
                fraction={foeLevel / site.levelBand[1]}
                label={`LV${foeLevel}`}
                labelSize={18}
                labelY={36}
                a11y={`Enemy level ${foeLevel}`}
              />
              <T size={13} lh={1.45} color={C.mist} style={{ flex: 1 }}>
                {info.desc}
              </T>
            </View>
          </View>
        </Panel>

        {warmedUp ? (
          <Card
            accent={C.success}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: C.success,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="check" size={20} color={C.floor} strokeWidth={3} />
            </View>
            <View style={{ flex: 1 }}>
              <H size={16} skewLeft>
                WARMED UP
              </H>
              <T size={12} color={C.mist}>
                Buff for this expedition: +{pct(WARMUP_GOLD_BONUS)} loot and +
                {pct(WARMUP_WIN_BONUS)} win chance in every fight.
              </T>
            </View>
          </Card>
        ) : (
          <Card style={{ gap: 10 }}>
            <View style={{ gap: 2 }}>
              <H size={16} skewLeft>
                WARM UP FIRST · OPTIONAL
              </H>
              <T size={12} lh={1.4} color={C.mist}>
                1 quick set of {warmup.name.toLowerCase()} buffs this expedition
                only: +{pct(WARMUP_GOLD_BONUS)} loot and +
                {pct(WARMUP_WIN_BONUS)} win chance. Your stats and level don’t
                change.
              </T>
            </View>
            <CrimsonButton
              label="WARM UP"
              icon="play"
              height={44}
              fontSize={16}
              onPress={() => nav.navigate('Workout', { warmup: true })}
            />
          </Card>
        )}

        <GoldButton
          label={running ? 'EXPEDITION UNDERWAY' : 'START EXPEDITION'}
          height={56}
          fontSize={21}
          trackWidth={360}
          disabled={running}
          onPress={go}
        />
      </ScrollView>
    </Screen>
  )
}
