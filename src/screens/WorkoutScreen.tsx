/** Workout in progress — docs/mockups/workout.html (focus mode, beat = rep cadence). */
import { useRoute, type RouteProp } from '@react-navigation/native'
import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Pressable, View } from 'react-native'
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg'

import { getExercise } from '../../rpg/exercises'
import {
  WARMUP_EXERCISE,
  WARMUP_GOLD_BONUS,
  WARMUP_WIN_BONUS,
} from '../../rpg/expedition'
import {
  formatClock,
  REST_SECONDS,
  sessionReducer,
  startSession,
} from '../../rpg/workoutSession'
import { Floodlight, Puff } from '../components/arenabackground/parts'
import {
  SceneSvg,
  Screen,
  useCanvasHeight,
} from '../components/arenabackground/Screen'
import { Sprite } from '../components/arenabackground/Sprite'
import {
  Card,
  CrimsonButton,
  GoldButton,
  H,
  IconButton,
  N,
  Panel,
  T,
  TapeTag,
} from '../components/ui'
import { Icon } from '../components/ui/Icon'
import { harderStep } from '../../rpg/progress'
import type { Quest } from '../../rpg/quests'
import type { RootStackParamList } from '../navigation/types'
import { useNav } from '../navigation/useNav'
import { useCamp } from '../state/useCamp'
import { useHero, useTodayQuests } from '../state/useHero'
import { C, F, STAT_TEXT, type StatKey } from '../theme/tokens'

const HR_SEG = 'h40l6-10 6 26 6-40 6 30 6-6h50'

function FocusScene() {
  const H = useCanvasHeight()
  return (
    <>
      <SceneSvg>
        <Rect x={0} y={0} width={34} height={8} rx={2} fill={C.steel} />
        <Rect x={356} y={0} width={34} height={8} rx={2} fill={C.steel} />
      </SceneSvg>
      <Floodlight
        lamp={[0, 0, 0, 0]}
        beam={[
          [6, 8],
          [30, 8],
          [290, 470],
          [110, 470],
        ]}
        topOpacity={0.2}
        flick="flickSoft"
        gradient="diagL"
      />
      <Floodlight
        lamp={[0, 0, 0, 0]}
        beam={[
          [360, 8],
          [384, 8],
          [280, 470],
          [100, 470],
        ]}
        topOpacity={0.2}
        flick="flickSoft"
        gradient="diagR"
      />
      <Sprite
        box={[0, 320, 900, 60]}
        anim={{ name: 'hr', period: 2 }}
        svg={
          <G transform="translate(0 360)">
            <Path
              d={'M0 0' + HR_SEG.repeat(8)}
              fill="none"
              stroke={C.hype}
              strokeOpacity={0.55}
              strokeWidth={2}
              strokeLinejoin="round"
            />
          </G>
        }
      />
      <SceneSvg>
        <Rect x={0} y={H - 48} width={390} height={48} fill={C.floorDeep} />
        <Rect x={0} y={H - 48} width={390} height={3} fill={C.crimson} />
      </SceneSvg>
    </>
  )
}

/** The big 290px weight-plate ring. In reps mode, tapping it counts a rep. */
function TimerPlate({
  fraction,
  time,
  status,
  onPress,
}: {
  fraction: number
  time: string
  status: string
  onPress?: () => void
}) {
  const circ = 728.8
  const f = Math.max(0, Math.min(1, fraction))
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? 'Count a rep' : undefined}
      style={({ pressed }) => ({
        width: 290,
        height: 290,
        marginTop: 14,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <Svg width={290} height={290} style={{ position: 'absolute' }}>
        <Circle
          cx={145}
          cy={145}
          r={142}
          fill={C.iron}
          stroke={C.steel}
          strokeWidth={3}
        />
        <Circle
          cx={145}
          cy={145}
          r={116}
          fill="none"
          stroke={C.ironTrack}
          strokeWidth={30}
        />
        <Circle
          cx={145}
          cy={145}
          r={116}
          fill="none"
          stroke={C.gold}
          strokeWidth={30}
          strokeDasharray={`${circ}`}
          strokeDashoffset={circ * (1 - f)}
          transform="rotate(-90 145 145)"
        />
        <Circle
          cx={145}
          cy={145}
          r={100}
          fill={C.ironDark}
          stroke={C.steel}
          strokeWidth={2}
        />
        <Circle
          cx={145}
          cy={145}
          r={131}
          fill="none"
          stroke={C.steel}
          strokeWidth={1}
        />
        <SvgText
          x={145}
          y={18}
          textAnchor="middle"
          fontFamily={F.num}
          fontSize={13}
          fill={C.steelLight}
        >
          20 KG
        </SvgText>
      </Svg>
      {/* puffs live in ring coordinates */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', left: 0, top: 0 }}
      >
        <Puff cx={110} cy={262} r={4} period={1} />
        <Puff cx={145} cy={270} r={3} period={1} offset={1 / 3} />
        <Puff cx={180} cy={262} r={4} period={1} offset={2 / 3} />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <N size={108} lh={0.8} style={{ paddingTop: 16 }}>
          {time}
        </N>
        <T f="body700" size={11} ls={0.2} color={C.steelLight}>
          {status}
        </T>
      </View>
    </Pressable>
  )
}

function Counter({
  label,
  value,
  of,
}: {
  label: string
  value: number
  of: number
}) {
  return (
    <Panel
      label={label}
      stripPad={[4, 10]}
      stripSize={10}
      radius={12}
      style={{ flex: 1 }}
    >
      <View style={{ paddingTop: 4, paddingHorizontal: 10, paddingBottom: 2 }}>
        <N size={40} lh={1}>
          {value}
          <N size={40} color={C.steelLight}>
            /{of}
          </N>
        </N>
      </View>
    </Panel>
  )
}

/** Shrinks long exercise names so they stay on one line. */
const titleSize = (name: string) =>
  name.length > 18 ? 30 : name.length > 12 ? 38 : 48

function Result({
  result,
  stat,
  warmup,
  onBack,
}: {
  result: { awarded: number } | null
  stat: StatKey
  warmup?: boolean
  onBack: () => void
}) {
  return (
    <View style={{ alignSelf: 'stretch', marginTop: 28, gap: 14 }}>
      <Card
        featured
        style={{ alignItems: 'center', gap: 8, paddingVertical: 24 }}
      >
        <TapeTag label={warmup ? 'WARMED UP' : 'QUEST COMPLETE'} />
        {warmup ? (
          <H size={32} skew color={C.gold}>
            BUFF READY
          </H>
        ) : result && result.awarded > 0 ? (
          <N size={72} lh={1}>
            +{result.awarded}{' '}
            <N size={72} color={STAT_TEXT[stat]}>
              {stat}
            </N>
          </N>
        ) : (
          <H size={32} skew color={C.gold}>
            SET COMPLETE
          </H>
        )}
        <T size={14} color={C.mist} align="center">
          {warmup
            ? `Your next expedition gets +${Math.round(WARMUP_GOLD_BONUS * 100)}% loot and +${Math.round(WARMUP_WIN_BONUS * 100)}% win chance.`
            : 'Stats saved. RAID POWERED UP.'}
        </T>
      </Card>
      <GoldButton
        label={warmup ? 'BACK TO YOUR CALL' : 'BACK TO QUESTS'}
        height={56}
        fontSize={21}
        trackWidth={360}
        onPress={onBack}
      />
    </View>
  )
}

function Missing({ onBack }: { onBack: () => void }) {
  return (
    <View
      style={{
        marginTop: 120,
        alignSelf: 'stretch',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <H size={30} skew>
        QUEST NOT FOUND
      </H>
      <T size={14} color={C.mist} align="center">
        A new day started, so this quest moved on. Check today’s board.
      </T>
      <CrimsonButton
        label="BACK"
        height={52}
        fontSize={19}
        style={{ alignSelf: 'stretch' }}
        onPress={onBack}
      />
    </View>
  )
}

export default function Workout() {
  const nav = useNav()
  const route = useRoute<RouteProp<RootStackParamList, 'Workout'>>()
  const params = route.params
  // Warm-up before an expedition: one set, a bonus stat and a loot boost
  const isWarmup = 'warmup' in params
  const questId = 'questId' in params ? params.questId : null
  const view = useTodayQuests().find((v) => v.quest.id === questId)
  const swap = useHero((s) => s.swap)
  const harderSwap = useHero((s) => s.harder)
  const complete = useHero((s) => s.complete)
  const classId = useHero((s) => s.classId) ?? 'warrior'
  const markWarmup = useCamp((s) => s.markWarmup)

  const [warmId, setWarmId] = useState(WARMUP_EXERCISE[classId] ?? 'squats')
  const warmExercise = useMemo(
    () => ({ ...getExercise(warmId), sets: 1 }),
    [warmId]
  )
  const exercise = isWarmup
    ? warmExercise
    : (view?.exercise ?? getExercise('push-ups'))
  const [s, dispatch] = useReducer(sessionReducer, exercise, startSession)
  const [result, setResult] = useState<{ awarded: number } | null>(null)
  const finished = s.phase === 'DONE'

  // A swap changes the exercise: start the session over with it
  useEffect(() => {
    if (s.exerciseId !== exercise.id) dispatch({ type: 'RESTART', exercise })
  }, [exercise, s.exerciseId])

  // One tick a second while the workout runs
  useEffect(() => {
    if (finished) return
    const t = setInterval(() => dispatch({ type: 'TICK' }), 1000)
    return () => clearInterval(t)
  }, [finished])

  // Once, when the last set ends: award the quest, or ready the warm-up buff
  const awarded = useRef(false)
  useEffect(() => {
    if (!finished || awarded.current) return
    if (isWarmup) {
      awarded.current = true
      markWarmup()
      setResult({ awarded: 0 })
    } else if (view) {
      awarded.current = true
      setResult(complete(view.quest.id))
    }
  }, [finished, view, complete, isWarmup, markWarmup])

  const back = () => nav.goBack()
  const resting = s.phase === 'REST'
  const repsMode = s.mode === 'reps'
  const easier = exercise.easierId ? getExercise(exercise.easierId) : null
  // One step back up the swap chain (quest: its planned exercise; warm-up:
  // the class's warm-up movement)
  const harder = isWarmup
    ? harderStep(
        { exerciseId: WARMUP_EXERCISE[classId] ?? 'squats' } as Quest,
        exercise.id
      )
    : view?.harder

  const coach = s.paused
    ? 'CATCH YOUR BREATH'
    : resting
      ? `REST UP · SET ${s.set + 1} NEXT`
      : `SET ${s.set} OF ${s.sets} · ${repsMode ? 'REP IT OUT' : 'HOLD STRONG'}`

  const plate = resting
    ? {
        fraction: s.remaining / REST_SECONDS,
        time: formatClock(s.remaining),
        status: 'REST',
      }
    : repsMode
      ? {
          fraction: s.reps / s.target,
          time: String(s.reps).padStart(2, '0'),
          status: 'TAP THE PLATE EACH REP',
        }
      : {
          fraction: s.remaining / s.target,
          time: formatClock(s.remaining),
          status: 'REMAINING',
        }

  return (
    <Screen
      bpm={50}
      glow={{ cx: 0.5, cy: 0.42, rx: 0.8, ry: 0.4, opacity: 0.25 }}
    >
      <FocusScene />
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          paddingTop: 50,
          paddingHorizontal: 20,
          alignItems: 'center',
        }}
      >
        <View
          style={{
            alignSelf: 'stretch',
            height: 44,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <TapeTag
            label={
              isWarmup
                ? 'WARM-UP'
                : view?.quest.track === 'WORLD'
                  ? 'WORLD QUEST'
                  : 'CLASS QUEST'
            }
            pad={[4, 9]}
          />
          <IconButton
            icon="x"
            label="End workout"
            strokeWidth={2.2}
            onPress={back}
          />
        </View>

        {!view && !isWarmup ? (
          <Missing onBack={back} />
        ) : (
          <>
            <H
              size={titleSize(exercise.name)}
              lh={1}
              skew
              numberOfLines={1}
              style={{ marginTop: 12 }}
            >
              {exercise.name.toUpperCase()}
            </H>
            {finished ? (
              <Result
                result={result}
                stat={isWarmup ? exercise.stat : view!.quest.reward.stat}
                warmup={isWarmup}
                onBack={back}
              />
            ) : (
              <>
                <T
                  f="body700"
                  size={12}
                  ls={0.18}
                  color={C.gold}
                  style={{ marginTop: 6 }}
                >
                  {coach}
                </T>
                <T
                  size={13}
                  color={C.mist}
                  align="center"
                  numberOfLines={2}
                  style={{ marginTop: 6, minHeight: 34 }}
                >
                  {exercise.cues.join(' ')}
                </T>
                <TimerPlate
                  fraction={plate.fraction}
                  time={plate.time}
                  status={s.paused ? 'PAUSED' : plate.status}
                  onPress={
                    repsMode && !resting && !s.paused
                      ? () => dispatch({ type: 'REP' })
                      : undefined
                  }
                />
                <View
                  style={{
                    alignSelf: 'stretch',
                    marginTop: 18,
                    flexDirection: 'row',
                    gap: 10,
                  }}
                >
                  {repsMode ? (
                    <Counter label="REPS" value={s.reps} of={s.target} />
                  ) : (
                    <Counter
                      label="SECONDS"
                      value={resting ? s.target : s.target - s.remaining}
                      of={s.target}
                    />
                  )}
                  <Counter label="SET" value={s.set} of={s.sets} />
                </View>
                <View
                  style={{
                    alignSelf: 'stretch',
                    marginTop: 18,
                    flexDirection: 'row',
                    gap: 10,
                  }}
                >
                  <CrimsonButton
                    label={s.paused ? 'RESUME' : 'PAUSE'}
                    height={58}
                    fontSize={19}
                    style={{ flex: 1 }}
                    onPress={() => dispatch({ type: 'TOGGLE_PAUSE' })}
                  />
                  <GoldButton
                    label={resting ? 'SKIP REST' : 'SET DONE'}
                    height={52}
                    fontSize={19}
                    trackWidth={220}
                    style={{ flex: 1.3, borderRadius: 12 }}
                    onPress={() =>
                      dispatch({ type: resting ? 'SKIP_REST' : 'SET_DONE' })
                    }
                  />
                </View>
                {easier || harder ? (
                  <View
                    style={{
                      marginTop: 10,
                      height: 44,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 20,
                    }}
                  >
                    {easier ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Swap to ${easier.name}`}
                        hitSlop={8}
                        onPress={() =>
                          isWarmup ? setWarmId(easier.id) : swap(view!.quest.id)
                        }
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <Icon name="swap" size={15} color={C.mist} />
                        <T size={13} color={C.mist}>
                          {harder ? 'Easier' : 'Too tough? Swap to'}{' '}
                          {easier.name.toLowerCase()}
                        </T>
                      </Pressable>
                    ) : null}
                    {harder ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Swap back to ${harder.name}`}
                        hitSlop={8}
                        onPress={() =>
                          isWarmup
                            ? setWarmId(harder.id)
                            : harderSwap(view!.quest.id)
                        }
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <Icon name="swap" size={15} color={C.gold} />
                        <T size={13} color={C.gold}>
                          Harder: {harder.name.toLowerCase()}
                        </T>
                      </Pressable>
                    ) : null}
                  </View>
                ) : (
                  <T size={12} color={C.steelLight} style={{ marginTop: 22 }}>
                    Stop anytime. Rest is part of training.
                  </T>
                )}
              </>
            )}
          </>
        )}
      </View>
    </Screen>
  )
}
