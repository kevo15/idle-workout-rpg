/**
 * All workouts: the in-app version of the workout sheet (docs/workouts.html),
 * opened from the Quests tab's QUEST BOARD. Every quest workout by class
 * (yours first), then the ones every class can get, each with its looping
 * diagram, sets, reward and easier swap. Tap one for how it's done. Built
 * from rpg/data/workouts.json, so it always matches the quests.
 */
import { useState } from 'react'
import { Pressable, View } from 'react-native'

import { CLASS_ORDER, CLASSES, type ClassId } from '../../rpg/classes'
import {
  EXERCISES,
  PRIMARY_EXERCISES,
  WARMUPS,
  type Exercise,
} from '../../rpg/exercises'
import { Screen, ScreenBody } from '../components/arenabackground/Screen'
import { ExerciseDiagram } from '../components/ExerciseDiagram'
import { HowToModal } from '../components/HowToModal'
import { H, Header, IconButton, Panel, T, TapeTag } from '../components/ui'
import { useNav } from '../navigation/useNav'
import { useHero } from '../state/useHero'
import { C, STAT_TEXT } from '../theme/tokens'
import { setsLabel } from '../utils/format'

function WorkoutRow({
  e,
  warmup,
  onPress,
}: {
  e: Exercise
  warmup: boolean
  onPress: () => void
}) {
  const easier = e.easierId ? EXERCISES[e.easierId] : null
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`How to do ${e.name.toLowerCase()}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 8,
        borderRadius: 12,
        backgroundColor: C.ironDark,
        borderWidth: 1,
        borderColor: C.steel,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          borderRadius: 8,
          backgroundColor: C.floor,
          overflow: 'hidden',
        }}
      >
        <ExerciseDiagram exercise={e} width={80} still />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <H size={16} lh={1.1} skewLeft>
          {e.name.toUpperCase()}
        </H>
        <T size={12} color={C.mist}>
          {setsLabel(e)} · {e.impact} impact
        </T>
        {easier ? (
          <T size={11} color={C.steelLight}>
            Easier: {easier.name}
          </T>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <T f="body800" size={13} color={STAT_TEXT[e.stat]}>
          +{e.reward} {e.stat}
        </T>
        {warmup ? (
          <T f="body800" size={9} ls={0.1} color={C.gold}>
            WARM-UP
          </T>
        ) : null}
      </View>
    </Pressable>
  )
}

export default function WorkoutsScreen() {
  const nav = useNav()
  const mine = useHero((s) => s.classId)
  const [howTo, setHowTo] = useState<Exercise | null>(null)
  const order: ClassId[] = mine
    ? [mine, ...CLASS_ORDER.filter((c) => c !== mine)]
    : CLASS_ORDER
  const world = PRIMARY_EXERCISES.filter((e) => e.classAffinity.length === 0)

  return (
    <Screen
      bpm={90}
      glow={{ cx: 0.5, cy: 0.2, rx: 0.8, ry: 0.3, opacity: 0.18 }}
      split={104}
    >
      <Header padLeft={16} gap={12}>
        <IconButton
          icon="x"
          label="Close"
          strokeWidth={2.2}
          onPress={() => nav.goBack()}
        />
        <H size={30} lh={1} skew style={{ flex: 1, marginBottom: 4 }}>
          ALL WORKOUTS
        </H>
      </Header>
      <ScreenBody style={{ padding: 16, paddingBottom: 32, gap: 12 }}>
        <T size={13} lh={1.45} color={C.mist}>
          About 60% of your quests are CLASS quests from your class’s list; the
          rest are WORLD quests from the other lists. Too tough? Every quest has
          an Easier swap that keeps the reward. Tap a workout to see how it’s
          done.
        </T>
        {order.map((id) => {
          const c = CLASSES[id]
          const list = PRIMARY_EXERCISES.filter((e) =>
            e.classAffinity.includes(id)
          )
          return (
            <Panel
              key={id}
              label={id === mine ? `${c.name} · YOUR CLASS` : c.name}
              right={`${list.length} workouts`}
            >
              <View style={{ padding: 10, gap: 8 }}>
                <T size={12} lh={1.4} color={C.mist}>
                  {c.workoutTheme.charAt(0).toUpperCase() +
                    c.workoutTheme.slice(1)}
                  .
                </T>
                {list.map((e) => (
                  <WorkoutRow
                    key={e.id}
                    e={e}
                    warmup={WARMUPS[id] === e.id}
                    onPress={() => setHowTo(e)}
                  />
                ))}
              </View>
            </Panel>
          )
        })}
        {world.length ? (
          <Panel label="EVERY CLASS" right="world quests only">
            <View style={{ padding: 10, gap: 8 }}>
              <View style={{ alignSelf: 'flex-start' }}>
                <TapeTag label="NO CLASS OWNS THESE" />
              </View>
              {world.map((e) => (
                <WorkoutRow
                  key={e.id}
                  e={e}
                  warmup={false}
                  onPress={() => setHowTo(e)}
                />
              ))}
            </View>
          </Panel>
        ) : null}
      </ScreenBody>
      <HowToModal exercise={howTo} onClose={() => setHowTo(null)} />
    </Screen>
  )
}
