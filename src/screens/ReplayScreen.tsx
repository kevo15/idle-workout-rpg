/**
 * YOUR CALL at the checkpoint — docs/mockups/replay.html (100 BPM). The
 * running expedition is stopped by a Brute: TAKE CONTROL (fight it yourself
 * on the Fight screen) or RETURN TO CAMP (run away, ending the night).
 * Watching and playing back past expeditions happen on the Fight screen.
 */
import { useNav } from '../navigation/useNav'
import { handFight } from '../navigation/fightRoute'
import { useRoute, type RouteProp } from '@react-navigation/native'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Pressable, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { G, Path, Polygon, Circle, Rect } from 'react-native-svg'

import { Sprite } from '../components/arenabackground/Sprite'
import { Icon, type IconName } from '../components/ui/Icon'
import { LAND_H } from '../components/arenabackground/layout'
import {
  SceneSvg,
  Screen,
  ScreenBody,
  useCanvasHeight,
  useCanvasWidth,
  useLandscape,
} from '../components/arenabackground/Screen'
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
  checkpointBoostExercise,
  phaseAt,
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

/** Landscape: the choice panel keeps at least this much width (design units);
 * the battle column takes the rest, between 390 and 560, and the fight is
 * zoomed by FIGHT_ZOOM. */
const MIN_PANEL_W = 330
const FIGHT_ZOOM = 1.3

/**
 * The arena, centred in the scene column. In landscape it's zoomed around the
 * fighters (y 178–330) into the room between the HP strip and the controls.
 */
function ArenaStage() {
  const W = useCanvasWidth()
  const H = useCanvasHeight()
  const landscape = useLandscape()
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: (W - 390) / 2,
        top: 0,
        width: 390,
        height: H,
        transformOrigin: '195px 254px',
        transform: landscape ? [{ translateY: 16 }, { scale: FIGHT_ZOOM }] : [],
      }}
    >
      <Arena />
    </View>
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
  fight: 'swords',
  watch: 'play',
  retreat: 'retreat',
}

/** The YOUR CALL decision panel (docs/mockups/replay.html). */
function DecisionPanel({
  onLock,
}: {
  onLock: (call: CheckpointOption['id']) => void
}) {
  const compact = useLandscape()
  const [pick, setPick] = useState<CheckpointOption['id']>('fight')
  const options = CHECKPOINT.options
  return (
    <>
      <Ribbon
        label="YOUR CALL"
        size={compact ? 14 : 16}
        padX={compact ? 22 : 28}
        padTop={4}
        ls={0.06}
      />
      <H size={compact ? 20 : 26} lh={1.05} align="center" skew>
        {CHECKPOINT.title}
      </H>
      <T size={compact ? 12 : 13} color={C.mist} align="center">
        {CHECKPOINT.sub}
      </T>
      <View accessibilityRole="radiogroup" style={{ gap: compact ? 6 : 8 }}>
        {options.map((o) => {
          const on = o.id === pick
          return (
            <Pressable
              key={o.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => setPick(o.id)}
              style={{
                height: compact ? 48 : 60,
                borderRadius: 12,
                paddingHorizontal: compact ? 10 : 12,
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
                  width: compact ? 30 : 36,
                  height: compact ? 30 : 36,
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
        height={compact ? 44 : 52}
        fontSize={compact ? 17 : 20}
        ls={0.05}
        trackWidth={compact ? 280 : 340}
        style={{ marginTop: 2 }}
        onPress={() => onLock(pick)}
      />
    </>
  )
}

/** The choice panel; tighter in landscape. */
function usePanelStyle() {
  const compact = useLandscape()
  return compact
    ? {
        ...panelStyle,
        marginHorizontal: 12,
        marginVertical: 12,
        paddingTop: 12,
        paddingHorizontal: 10,
        paddingBottom: 10,
        gap: 8,
      }
    : panelStyle
}

const panelStyle = {
  marginHorizontal: 16,
  marginBottom: 16,
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
  const classId = useHero((s) => s.classId ?? 'warrior')
  const current = useCamp((s) => s.current)
  const answer = useCamp((s) => s.answer)
  const waiting = current && phaseAt(current, Date.now()) === 'WAITING'
  const panel = usePanelStyle()
  return (
    <BattleScreen>
      <BattleHeader title="YOUR CALL" onClose={() => nav.goBack()} />
      <HpStrip hero={hero} heroHp={62} enemy="BRUTE" enemyHp={100} />
      <ScreenBody style={panel}>
        {waiting ? (
          <DecisionPanel
            onLock={(call) => {
              if (call === 'fight') {
                // The fight records the outcome (won / lost) when it ends
                nav.replace('Fight', handFight({ checkpoint: true }))
              } else if (call === 'watch') {
                // A boost set first (skippable), then the hero fights alone
                nav.replace('Workout', {
                  checkpointBoost: checkpointBoostExercise(current!, classId),
                })
              } else {
                answer('retreat')
                nav.goBack()
              }
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
      </ScreenBody>
    </BattleScreen>
  )
}

/** The arena with the battle header and HP strip above `split`; the panel
 * (a <ScreenBody>) below it, or beside it in landscape. */
/** Width of the landscape battle column, leaving the panel MIN_PANEL_W. */
function useBattleWidth() {
  const { width, height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const s = height / LAND_H
  const room = (width - insets.left - insets.right) / s
  return Math.max(390, Math.min(560, room - MIN_PANEL_W))
}

function BattleScreen({ children }: { children: ReactNode }) {
  const landscape = useLandscape()
  const battleW = useBattleWidth()
  return (
    <Screen
      bpm={100}
      glow={{ cx: 0.5, cy: 0.28, rx: 0.8, ry: 0.3, opacity: 0.25 }}
      split={386}
      sceneH={landscape ? 430 : undefined}
      sceneW={landscape ? battleW : undefined}
    >
      <ArenaStage />
      {children}
    </Screen>
  )
}

export default function Replay() {
  return <LiveDecision />
}
