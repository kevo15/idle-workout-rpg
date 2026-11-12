/**
 * Battle view — docs/mockups/replay.html (100 BPM). Modes: answer the
 * running checkpoint, WATCH a logged expedition, or PLAY it THROUGH.
 */
import { useNav } from '../navigation/useNav'
import { useRoute, type RouteProp } from '@react-navigation/native'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, View } from 'react-native'
import { G, Path, Polygon, Circle, Rect } from 'react-native-svg'

import { Sprite } from '../components/arenabackground/Sprite'
import { Icon, type IconName } from '../components/ui/Icon'
import { SceneSvg, Screen } from '../components/arenabackground/Screen'
import {
  CrimsonButton,
  GoldButton,
  H,
  Header,
  IconButton,
  N,
  Ribbon,
  T,
  TapeTag,
} from '../components/ui'
import { FloorShapes, Floodlight } from '../components/arenabackground/parts'
import {
  CHECKPOINT,
  checkpointBattle,
  phaseAt,
  placeholderBattles,
  type CheckpointOption,
} from '../../rpg/expedition'
import { getCampSite } from '../../rpg/world'
import type { RootStackParamList } from '../navigation/types'
import { useCamp } from '../state/useCamp'
import { useHero } from '../state/useHero'
import { C } from '../theme/tokens'

function Arena() {
  return (
    <>
      <Floodlight
        lamp={[110, 178, 26, 7]}
        beam={[
          [114, 185],
          [132, 185],
          [180, 316],
          [60, 316],
        ]}
        topOpacity={0.22}
        flick="flickSoft"
      />
      <Floodlight
        lamp={[256, 178, 26, 7]}
        beam={[
          [260, 185],
          [278, 185],
          [330, 316],
          [210, 316],
        ]}
        topOpacity={0.22}
        flick="flickSoft"
      />
      <SceneSvg>
        <FloorShapes y={316} grid={false} />
      </SceneSvg>
      {/* hero: bobs, sword raised */}
      <Sprite
        box={[100, 256, 52, 62]}
        anim={{ name: 'bob' }}
        svg={
          <G
            transform="translate(118 316)"
            fill={C.crimson}
            stroke={C.crimson}
            strokeLinecap="round"
          >
            <Path d="M-3 -18 L-8 0 M3 -18 L8 0" fill="none" strokeWidth={4} />
            <Circle cx={0} cy={-46} r={6} stroke="none" />
            <Polygon points="-7,-38 7,-38 5,-18 -5,-18" stroke="none" />
            <Path
              d="M-6 -35 L-14 -26 M6 -35 L18 -40"
              fill="none"
              strokeWidth={4}
            />
            <Path
              d="M18 -40 L30 -60"
              fill="none"
              stroke={C.chalk}
              strokeWidth={3}
            />
          </G>
        }
      />
      {/* brute: scaled 1.45, breathing from the feet */}
      <Sprite
        box={[245, 232, 62, 86]}
        pivot={[276, 316]}
        anim={{ name: 'breatheBig', period: 2 }}
        svg={
          <G
            transform="translate(276 316) scale(1.45)"
            fill={C.steel}
            stroke={C.steel}
            strokeLinecap="round"
          >
            <Path d="M-5 -20 L-9 0 M5 -20 L9 0" fill="none" strokeWidth={6} />
            <Circle cx={0} cy={-50} r={7} stroke="none" />
            <Polygon points="-12,-42 12,-42 8,-20 -8,-20" stroke="none" />
            <Path
              d="M-11 -38 L-18 -22 M11 -38 L18 -22"
              fill="none"
              strokeWidth={6}
            />
          </G>
        }
      />
    </>
  )
}

function HpBar({
  name,
  hp,
  color,
  right,
}: {
  name: string
  hp: number
  color: string
  right?: boolean
}) {
  const label = (
    <T f="body700" size={11} ls={0.1}>
      {name}
    </T>
  )
  const num = (
    <N size={22} lh={1}>
      {hp}
    </N>
  )
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}
      >
        {right ? num : label}
        {right ? label : num}
      </View>
      <View
        style={{
          height: 8,
          borderRadius: 2,
          backgroundColor: C.ironTrack,
          flexDirection: 'row',
          justifyContent: right ? 'flex-end' : 'flex-start',
        }}
      >
        <View
          style={{
            width: `${hp}%`,
            height: 8,
            borderRadius: 2,
            backgroundColor: color,
          }}
        />
      </View>
    </View>
  )
}

const ICONS: Record<CheckpointOption['id'], IconName> = {
  strike: 'flame',
  guard: 'shield',
  retreat: 'retreat',
}

/** The YOUR CALL decision panel (docs/mockups/replay.html). */
function DecisionPanel({
  onLock,
  allowRetreat = true,
}: {
  onLock: (call: CheckpointOption['id']) => void
  allowRetreat?: boolean
}) {
  const [pick, setPick] = useState<CheckpointOption['id']>('strike')
  const options = CHECKPOINT.options.filter(
    (o) => allowRetreat || o.id !== 'retreat'
  )
  return (
    <>
      <Ribbon label="YOUR CALL" size={16} padX={28} padTop={4} ls={0.06} />
      <H size={26} lh={1.05} align="center" skew>
        {CHECKPOINT.title}
      </H>
      <T size={13} color={C.mist} align="center">
        {CHECKPOINT.sub}
      </T>
      <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
        {options.map((o) => {
          const on = o.id === pick
          return (
            <Pressable
              key={o.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => setPick(o.id)}
              style={{
                height: 60,
                borderRadius: 12,
                paddingHorizontal: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                backgroundColor: on ? C.deepRed : '#16171B',
                borderWidth: 1.5,
                borderColor: on ? C.gold : C.steel,
                borderLeftWidth: 4,
                borderLeftColor: C.crimson,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  backgroundColor: C.floor,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={ICONS[o.id]} size={18} color={C.gold} />
              </View>
              <View style={{ flex: 1, gap: 1 }}>
                <H size={16} ls={0.02}>
                  {o.title}
                </H>
                <T size={12} color={C.mist}>
                  {o.sub}
                </T>
              </View>
            </Pressable>
          )
        })}
      </View>
      <GoldButton
        label="LOCK IT IN"
        height={52}
        fontSize={20}
        ls={0.05}
        trackWidth={340}
        style={{ marginTop: 2 }}
        onPress={() => onLock(pick)}
      />
    </>
  )
}

const panelStyle = {
  position: 'absolute' as const,
  left: 16,
  right: 16,
  top: 386,
  backgroundColor: 'rgba(30,31,36,0.95)',
  borderWidth: 1,
  borderColor: C.gold,
  borderRadius: 16,
  paddingTop: 16,
  paddingHorizontal: 14,
  paddingBottom: 14,
  gap: 10,
}

function BattleHeader({
  title,
  battle,
  total,
  onClose,
}: {
  title: string
  battle?: number
  total?: number
  onClose: () => void
}) {
  return (
    <Header padLeft={16} gap={12}>
      <IconButton icon="x" label="Close" strokeWidth={2.2} onPress={onClose} />
      <H size={32} lh={1} skew style={{ flex: 1, marginBottom: 4 }}>
        {title}
      </H>
      {total ? (
        <N size={26} lh={1} color={C.steelLight}>
          BATTLE{' '}
          <N size={26} color={C.chalk}>
            {battle}/{total}
          </N>
        </N>
      ) : null}
    </Header>
  )
}

function HpStrip({
  hero,
  heroHp,
  enemy,
  enemyHp,
}: {
  hero: string
  heroHp: number
  enemy: string
  enemyHp: number
}) {
  return (
    <View
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        top: 114,
        backgroundColor: C.iron,
        borderWidth: 2,
        borderColor: C.steel,
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <HpBar name={hero} hp={heroHp} color={C.gold} />
      <H size={16} color={C.steelLight}>
        VS
      </H>
      <HpBar name={enemy} hp={enemyHp} color={C.crimson} right />
    </View>
  )
}

/** Answer the running expedition's checkpoint (Camp → YOUR CALL). */
function LiveDecision() {
  const nav = useNav()
  const hero = useHero((s) => (s.classId ?? 'warrior').toUpperCase())
  const current = useCamp((s) => s.current)
  const answer = useCamp((s) => s.answer)
  const waiting = current && phaseAt(current, Date.now()) === 'WAITING'
  return (
    <>
      <BattleHeader title="YOUR CALL" onClose={() => nav.goBack()} />
      <HpStrip hero={hero} heroHp={62} enemy="BRUTE" enemyHp={100} />
      <View style={panelStyle}>
        {waiting ? (
          <DecisionPanel
            onLock={(call) => {
              answer(call)
              nav.goBack()
            }}
          />
        ) : (
          <>
            <H size={22} skew align="center">
              NOTHING TO DECIDE
            </H>
            <T size={13} color={C.mist} align="center">
              Your hero is on the road. Checkpoints appear on Camp.
            </T>
            <GoldButton
              label="BACK TO CAMP"
              height={52}
              fontSize={20}
              trackWidth={340}
              onPress={() => nav.goBack()}
            />
          </>
        )}
      </View>
    </>
  )
}

/** Step through a logged expedition: WATCH (read-only) or PLAY THROUGH. */
function Playback({ id, play }: { id: string; play: boolean }) {
  const nav = useNav()
  const hero = useHero((s) => (s.classId ?? 'warrior').toUpperCase())
  const entry = useCamp((s) => s.log.find((l) => l.expedition.id === id))
  const finishPlayThrough = useCamp((s) => s.finishPlayThrough)

  const battles = useMemo(
    () =>
      entry
        ? placeholderBattles(
            entry.expedition,
            entry.result,
            getCampSite(entry.expedition.siteId)
          )
        : [],
    [entry]
  )
  const total = battles.length
  const cp = checkpointBattle(total)

  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [fast, setFast] = useState(false)
  const [myCall, setMyCall] = useState<CheckpointOption['id'] | null>(null)
  const [bonus, setBonus] = useState<number | null>(null)

  // PLAY THROUGH stops at the checkpoint for the player's own call
  const atCheckpoint = play && index === cp && !myCall
  const ended = index >= total

  useEffect(() => {
    if (paused || atCheckpoint || ended) return
    const t = setTimeout(() => setIndex((i) => i + 1), fast ? 700 : 1400)
    return () => clearTimeout(t)
  }, [index, paused, atCheckpoint, ended, fast])

  // Pay the once-only play-through bonus at the end
  useEffect(() => {
    if (play && ended && bonus === null && entry) {
      setBonus(finishPlayThrough(entry.expedition.id))
    }
  }, [play, ended, bonus, entry, finishPlayThrough])

  if (!entry) {
    return (
      <>
        <BattleHeader title="REPLAY" onClose={() => nav.goBack()} />
        <View style={panelStyle}>
          <H size={22} skew align="center">
            EXPEDITION NOT FOUND
          </H>
        </View>
      </>
    )
  }

  const b = battles[Math.min(index, total - 1)]
  const originalCall = CHECKPOINT.options.find(
    (o) => o.id === entry.result.call
  )!
  const wonSoFar = battles
    .slice(0, Math.min(index + 1, total))
    .filter((x) => x.won).length

  return (
    <>
      <BattleHeader
        title={play ? 'PLAY THROUGH' : 'REPLAY'}
        battle={Math.min(index + 1, total)}
        total={total}
        onClose={() => nav.goBack()}
      />
      <HpStrip
        hero={hero}
        heroHp={b.won ? 70 - (index % 3) * 12 : 18}
        enemy={b.enemy.toUpperCase()}
        enemyHp={b.won ? 0 : 55}
      />

      <View
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          top: 330,
          height: 44,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <IconButton
          icon={paused ? 'play' : 'pause'}
          label={paused ? 'Resume' : 'Pause'}
          iconSize={14}
          onPress={() => setPaused((p) => !p)}
        />
        <View
          style={{
            flex: 1,
            height: 6,
            borderRadius: 3,
            backgroundColor: C.ironTrack,
          }}
        >
          <View
            style={{
              width: `${(Math.min(index + 1, total) / total) * 100}%`,
              height: 6,
              borderRadius: 3,
              backgroundColor: C.crimson,
            }}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Playback speed"
          onPress={() => setFast((f) => !f)}
          hitSlop={8}
        >
          <N size={22} lh={1} style={{ paddingTop: 3 }}>
            {fast ? '2×' : '1×'}
          </N>
        </Pressable>
      </View>

      <View style={panelStyle}>
        {atCheckpoint ? (
          <DecisionPanel onLock={setMyCall} allowRetreat={false} />
        ) : ended ? (
          <>
            <Ribbon
              label={play ? 'RUN COMPLETE' : 'REPLAY OVER'}
              size={16}
              padX={28}
              padTop={4}
              ls={0.06}
            />
            <N size={56} lh={1} align="center">
              {entry.result.won}/{total}{' '}
              <N size={56} color={C.steelLight}>
                WON
              </N>
            </N>
            <T size={13} color={C.mist} align="center">
              {play
                ? bonus
                  ? `Play-through bonus: +${bonus} gold. Last night's results stay as they were.`
                  : 'Bonus already collected for this expedition. Nice run!'
                : `That night earned +${entry.result.gold} gold. Watching never changes results.`}
            </T>
            <GoldButton
              label="BACK TO REPLAYS"
              height={52}
              fontSize={20}
              trackWidth={340}
              onPress={() => nav.goBack()}
            />
          </>
        ) : (
          <>
            <TapeTag
              label={play ? 'YOU ARE PLAYING' : 'WATCHING · READ ONLY'}
            />
            <H size={24} skewLeft>
              {b.enemy.toUpperCase()} · {b.won ? 'WON' : 'LOST'}
            </H>
            <T size={13} lh={1.45} color={C.mist}>
              Battles won so far: {wonSoFar}.{' '}
              {index >= cp
                ? play
                  ? `At the checkpoint you chose ${CHECKPOINT.options.find((o) => o.id === myCall)?.title.toLowerCase()}.`
                  : `At the checkpoint the call was ${originalCall.title.toLowerCase()}.`
                : 'A checkpoint is coming up.'}
            </T>
            <CrimsonButton
              label="SKIP TO END"
              height={44}
              fontSize={16}
              disabled={play && index < cp}
              onPress={() => setIndex(total)}
            />
          </>
        )}
      </View>
    </>
  )
}

export default function Replay() {
  const route = useRoute<RouteProp<RootStackParamList, 'Replay'>>()
  const params = route.params
  return (
    <Screen
      bpm={100}
      glow={{ cx: 0.5, cy: 0.28, rx: 0.8, ry: 0.3, opacity: 0.25 }}
    >
      <Arena />
      {params.mode === 'decision' ? (
        <LiveDecision />
      ) : (
        <Playback id={params.expeditionId} play={params.mode === 'play'} />
      )}
    </Screen>
  )
}
