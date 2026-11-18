/**
 * Fight: a hand-played, Street Fighter-style duel (rpg/fight.ts).
 *
 * The screen is split 70/30: the fight on top, the controls in a band below
 * the ground line. The analog stick moves (left/right) and jumps (push up);
 * ATTACK swings and DODGE back-steps out of a swing. Both buttons are native
 * gestures, so they work while the stick is held. DODGE is gold when ready
 * and dark while it recharges. A Rogue's ATTACK lights up when a counter is
 * ready (after a dodge).
 *
 * Health bars split across the top: the hero's on the left, the enemy's on
 * the right, the clock between, and a PAUSE button (resume, settings, quit)
 * under the enemy's bar. Portrait or landscape (Settings). It runs a single
 * spar or a play-through's key fights in a row.
 */
import { useRoute, type RouteProp } from '@react-navigation/native'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, {
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg'

import { CLASSES } from '../../rpg/classes'
import { encounterGold } from '../../rpg/encounters'
import {
  CHECKPOINT,
  CHECKPOINT_BOOST,
  CHECKPOINT_WATCH_WIN,
  CHECKPOINT_WIN,
  checkpointWatchWins,
  playThroughFights,
} from '../../rpg/expedition'
import { seeded } from '../../rpg/rng'
import {
  ARENA,
  enemyFighter,
  heroAutopilot,
  heroDodges,
  heroFighter,
  heroHits,
  hpShare,
  KO_FALL_MS,
  kindOf,
  newFight,
  replaySeed,
  stepFight,
  timeLeft,
  type Fight,
  type Fighter,
  type FightInput,
} from '../../rpg/fight'
import { levelInfo } from '../../rpg/progress'
import { getCampSite } from '../../rpg/world'
import { BeatProvider } from '../components/arenabackground/beat'
import {
  CrimsonButton,
  GoldButton,
  H,
  Icon,
  IconButton,
  T,
  type IconName,
} from '../components/ui'
import FighterSprite from '../fight/FighterSprite'
import {
  ENEMY_SKINS,
  heroSkin,
  poseFor,
  type FighterSkin,
  sheetsOf,
} from '../fight/sprites'
import { profileAt } from '../../rpg/balance'
import { preloadSkins } from '../fight/preload'
import { ProjectileView } from '../fight/Projectile'
import { useLoad } from '../components/loading/useLoad'
import { FIGHT_TIPS, tutorialSteps } from '../../rpg/tutorial'
import { useBackButton } from '../navigation/useBack'
import type { RootStackParamList } from '../navigation/types'
import { useNav } from '../navigation/useNav'
import Joystick from '../overworld/components/Joystick'
import { newStepClock, stepsDue } from '../overworld/fixedStep'
import type { StickVector } from '../overworld/useOverworldMovement'
import { useCamp } from '../state/useCamp'
import { useHero } from '../state/useHero'
import { C, F, SKEW } from '../theme/tokens'

type Phase = 'intro' | 'fight' | 'ko' | 'result' | 'paused'

/** A number or call-out floating up over the fight. */
type Pop = {
  id: number
  x: number
  text: string
  color: string
  big?: boolean
  born: number
}

const INTRO_MS = 1600
/** After the K.O.: let the swing and the fall play, then the result. */
const KO_HOLD_MS = KO_FALL_MS + 1100
const POP_MS = 900
/** The controls band's share of the screen height. */
const CONTROLS = 0.3
/** Stick pushed up this far: jump. */
const JUMP_STICK = -0.55

function HealthBar({
  name,
  sub,
  share,
  side,
}: {
  name: string
  sub: string
  share: number
  side: 'left' | 'right'
}) {
  const low = share < 0.3
  const dir = side === 'left' ? 'row' : 'row-reverse'
  return (
    <View
      style={{
        flex: 1,
        gap: 3,
        alignItems: side === 'left' ? 'flex-start' : 'flex-end',
      }}
    >
      <View
        style={{
          alignSelf: 'stretch',
          height: 16,
          borderRadius: 4,
          borderWidth: 2,
          borderColor: C.chalk,
          backgroundColor: C.deepRed,
          overflow: 'hidden',
          flexDirection: dir,
        }}
      >
        <View
          style={{
            width: `${Math.max(0, share) * 100}%`,
            backgroundColor: low ? C.hype : C.gold,
          }}
        />
      </View>
      <View style={{ flexDirection: dir, gap: 6, alignItems: 'baseline' }}>
        <H size={15} lh={1} skew>
          {name}
        </H>
        <T f="body700" size={10} ls={0.1} color={C.steelLight}>
          {sub}
        </T>
      </View>
    </View>
  )
}

/**
 * A round button that acts on touch-down. A native gesture (not a
 * Pressable), so it works while the other thumb holds the stick.
 */
function ActionButton({
  label,
  icon,
  size,
  bg,
  fg,
  border,
  onPress,
  drain = 0,
}: {
  label: string
  icon: IconName
  size: number
  bg: string
  fg: string
  border: string
  onPress: () => void
  /** 0..1 still recharging (the gold refills from the bottom). */
  drain?: number
}) {
  const [down, setDown] = useState(false)
  const tap = useMemo(
    () =>
      Gesture.Tap()
        .runOnJS(true)
        .maxDuration(60000)
        .maxDistance(80)
        .onBegin(() => {
          setDown(true)
          onPress()
        })
        .onFinalize(() => setDown(false)),
    [onPress]
  )
  return (
    <GestureDetector gesture={tap}>
      <View
        accessibilityRole="button"
        accessibilityLabel={label}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          borderWidth: 3,
          borderColor: border,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          transform: [{ scale: down ? 0.92 : 1 }],
        }}
      >
        {drain > 0 ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: `${(1 - drain) * 100}%`,
              backgroundColor: 'rgba(242,178,51,0.35)',
            }}
          />
        ) : null}
        <Icon name={icon} size={size * 0.34} color={fg} />
        <Text style={[styles.btnLabel, { color: fg }]}>{label}</Text>
      </View>
    </GestureDetector>
  )
}

const Backdrop = memo(function Backdrop({
  width,
  height,
  floorY,
  bandY,
}: {
  width: number
  height: number
  floorY: number
  /** Where the controls band starts. */
  bandY: number
}) {
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id="fightWall" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={C.floor} />
          <Stop offset="1" stopColor={C.wallBottom} />
        </LinearGradient>
        <LinearGradient id="fightBeam" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={C.chalk} stopOpacity={0.16} />
          <Stop offset="1" stopColor={C.chalk} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect width={width} height={bandY} fill="url(#fightWall)" />
      <Path
        d={`M${width * 0.2} 0 L${width * 0.3} 0 L${width * 0.45} ${floorY} L${width * 0.05} ${floorY} Z`}
        fill="url(#fightBeam)"
      />
      <Path
        d={`M${width * 0.7} 0 L${width * 0.8} 0 L${width * 0.95} ${floorY} L${width * 0.55} ${floorY} Z`}
        fill="url(#fightBeam)"
      />
      <Rect y={floorY} width={width} height={bandY - floorY} fill={C.iron} />
      <Rect y={floorY} width={width} height={3} fill={C.crimson} />
      {/* The controls band */}
      <Rect
        y={bandY}
        width={width}
        height={height - bandY}
        fill={C.floorDeep}
      />
      <Rect y={bandY} width={width} height={2} fill={C.steel} />
    </Svg>
  )
})

/** The summon's colour: its ground ring and hit pips. */
const SUMMON_TEAL = '#4FE0C8'

/**
 * Marks the summon as yours: a teal ring on the floor under it and its hits
 * left as pips over its head.
 */
function SummonMark({
  f,
  x,
  floorY,
  s,
}: {
  f: Fighter
  x: number
  floorY: number
  s: number
}) {
  const w = 34 * s
  const barW = 30 * s
  return (
    <>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: x - w / 2,
          top: floorY - 5 * s,
          width: w,
          height: 10 * s,
          borderRadius: 5 * s,
          borderWidth: Math.max(1, 1.5 * s),
          borderColor: SUMMON_TEAL,
          backgroundColor: 'rgba(79,224,200,0.18)',
        }}
      />
      {f.state === 'ko' ? null : (
        // Hits left: one pip each (each hit on it hurts the Summoner)
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: x - barW / 2,
            top: floorY - (f.z + 70) * s,
            width: barW,
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 3 * s,
          }}
        >
          {Array.from({ length: f.stats.maxHp }, (_, i) => (
            <View
              key={i}
              style={{
                width: 6 * s,
                height: 6 * s,
                borderRadius: 3 * s,
                borderWidth: Math.max(1, s),
                borderColor: SUMMON_TEAL,
                backgroundColor: i < f.hp ? SUMMON_TEAL : 'rgba(0,0,0,0.6)',
              }}
            />
          ))}
        </View>
      )}
    </>
  )
}

/** A fight to play or watch (a recorded one carries its seed and skill). */
type WatchedFight = {
  enemy: string
  level: number
  won: boolean
  plan?: { seed: string; skill: number }
}

export default function FightScreen() {
  const nav = useNav()
  const insets = useSafeAreaInsets()
  const params = useRoute<RouteProp<RootStackParamList, 'Fight'>>().params
  const heroLevel = useHero((s) => levelInfo(s.stats).level)
  // DEV spar as another class: a typical hero of that class at your level
  const asClass = 'asClass' in params ? params.asClass : undefined
  const ownStats = useHero((s) => s.stats)
  const ownClass = useHero((s) => s.classId) ?? 'warrior'
  const classId = asClass ?? ownClass
  const stats = useMemo(
    () => (asClass ? profileAt(asClass, heroLevel) : ownStats),
    [asClass, heroLevel, ownStats]
  )
  const finishPlayThrough = useCamp((s) => s.finishPlayThrough)

  const answer = useCamp((s) => s.answer)

  // What this is: a spar, PLAY THROUGH, WATCH (autopilot replay), or the
  // checkpoint Brute; and who to fight
  const mode:
    'spar' | 'play' | 'watch' | 'checkpoint' | 'encounter' | 'tutorial' =
    'tutorial' in params
      ? 'tutorial'
      : 'watch' in params
        ? 'watch'
        : 'checkpoint' in params
          ? 'checkpoint'
          : 'encounter' in params
            ? 'encounter'
            : 'expeditionId' in params
              ? 'play'
              : 'spar'
  const expeditionId =
    'expeditionId' in params
      ? params.expeditionId
      : 'watch' in params
        ? params.watch
        : null
  // YOUR CALL → WATCH: the hero fights the Brute on autopilot
  const autoCheckpoint =
    'checkpoint' in params && params.auto ? params.auto : null
  const watching = mode === 'watch' || autoCheckpoint !== null
  // Combat training: a calm Goblin, step by step (rpg/tutorial.ts)
  const tutorial = mode === 'tutorial'
  const next = 'tutorial' in params ? params.then : undefined
  const lessons = useMemo(
    () => (tutorial ? tutorialSteps(classId) : []),
    [tutorial, classId]
  )
  const stepRef = useRef(0)
  const stepStartX = useRef(0)
  const finishTutorial = useHero((s) => s.finishTutorial)
  const [opponents] = useState(() => {
    if (mode === 'tutorial') return [{ enemy: 'Goblin', level: 1, won: true }]
    if (mode === 'spar') {
      const p = params as { enemy: string; level: number }
      return [{ enemy: p.enemy, level: p.level, won: true }]
    }
    if (mode === 'encounter') {
      const p = params as { encounter: { enemy: string; level: number } }
      return [{ ...p.encounter, won: true }]
    }
    if (mode === 'checkpoint') {
      const cur = useCamp.getState().current
      return [
        {
          enemy: CHECKPOINT.enemy,
          level: cur?.enemyLevel ?? 1,
          // Watching: the ending is decided by the odds (and the boost)
          won:
            autoCheckpoint && cur
              ? checkpointWatchWins(cur, autoCheckpoint.boosted)
              : true,
        },
      ]
    }
    const entry = useCamp
      .getState()
      .log.find((l) => l.expedition.id === expeditionId)
    if (!entry)
      return [{ enemy: 'Goblin', level: 1, won: true } as WatchedFight]
    return playThroughFights(
      entry.expedition,
      entry.result,
      getCampSite(entry.expedition.siteId)
    )
  })
  const [index, setIndex] = useState(0)
  const { enemy: enemyName, level } = opponents[index]
  const enemySkin: FighterSkin = ENEMY_SKINS[kindOf(enemyName)]
  // Every sheet both fighters use: kept mounted (no blank frame on a new
  // animation) and loaded before the round starts
  const heroLook = heroSkin(classId)
  const heroSheets = useMemo(() => sheetsOf(heroLook), [heroLook])
  const enemySheets = useMemo(() => sheetsOf(enemySkin), [enemySkin])
  const sheets = useLoad(
    () =>
      preloadSkins([
        heroLook,
        ...opponents.map((o) => ENEMY_SKINS[kindOf(o.enemy)]),
      ]),
    []
  )
  const sheetsReady = sheets.status !== 'loading'
  const series = opponents.length > 1
  const lastFight = index === opponents.length - 1
  /** The play-through bonus paid on finishing (null: not finished yet). */
  const [bonus, setBonus] = useState<number | null>(null)

  const [round, setRound] = useState(1)
  const fightRef = useRef<Fight | null>(null)
  /** WATCH: the autopilot driving the hero in the current recording. */
  const pilotRef = useRef<{ rand: () => number; skill: number } | null>(null)
  // WATCH replays a night with the hero as they set out (if recorded)
  const night = expeditionId
    ? useCamp.getState().log.find((l) => l.expedition.id === expeditionId)
        ?.expedition
    : undefined
  const makeFight = (i = index) => {
    const o = opponents[i] as WatchedFight
    const recorded = watching && o.plan && night?.heroStats
    const setup = {
      hero: recorded
        ? heroFighter(night!.heroStats!, night!.classId ?? classId)
        : heroFighter(stats, classId),
      enemy: enemyFighter(kindOf(o.enemy), o.level),
      enemyLevel: o.level,
    }
    if (watching) {
      // A recording that ends the way this battle really did
      const base = autoCheckpoint
        ? `checkpoint:${useCamp.getState().current?.id}`
        : `${expeditionId}:${i}`
      // The exact recorded fight, or one that ends the same way
      const plan = (recorded ? o.plan : null) ??
        replaySeed(setup, base, o.won) ?? {
          seed: `${base}:best`,
          skill: 1,
        }
      pilotRef.current = {
        rand: seeded(`${plan.seed}:pilot`),
        skill: plan.skill,
      }
      return newFight({ ...setup, seed: plan.seed })
    }
    if (tutorial) {
      // No clock: the steps set the pace
      const f = newFight({ ...setup, seed: 'training', timeLimitMs: 3_600_000 })
      stepRef.current = 0
      lessons[0]?.setup?.(f)
      stepStartX.current = f.hero.x
      return f
    }
    return newFight({ ...setup, seed: `${o.enemy}:${o.level}:${Date.now()}` })
  }
  if (!fightRef.current) fightRef.current = makeFight()

  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null
  )
  const [phase, setPhase] = useState<Phase>('intro')
  const phaseRef = useRef<Phase>('intro')
  phaseRef.current = phase
  const [, setTick] = useState(0)
  const pops = useRef<Pop[]>([])
  const logSeen = useRef(0)

  // ---- input ----
  const stickRef = useRef<StickVector>({ x: 0, y: 0 })
  const pressed = useRef({ attack: false, dodge: false })
  const stickUp = useRef(false)
  const readInput = (): FightInput => {
    const { x, y } = stickRef.current
    // Jump on the push up (not again while it's held up)
    const up = y < JUMP_STICK
    const jump = up && !stickUp.current
    stickUp.current = up
    const input = {
      move:
        Math.abs(x) < 0.25 ? 0 : Math.sign(x) * Math.min(1, Math.abs(x) * 1.3),
      jump,
      attack: pressed.current.attack,
      dodge: pressed.current.dodge,
    }
    pressed.current = { attack: false, dodge: false }
    return input
  }
  const onAttack = useMemo(() => () => (pressed.current.attack = true), [])
  /** WATCH: playback speed (1x / 2x) and skip-to-the-end. */
  const speedRef = useRef(1)
  const [speed, setSpeed] = useState(1)
  const skipRef = useRef(false)
  const onDodge = useMemo(() => () => (pressed.current.dodge = true), [])

  // ---- the loop: fixed 60 Hz steps, one render per frame ----
  useEffect(() => {
    const clock = newStepClock()
    let raf = 0
    let alive = true
    const frame = () => {
      if (!alive) return
      const f = fightRef.current!
      const p = phaseRef.current
      const running = p === 'fight' || p === 'ko'
      const steps = stepsDue(clock, performance.now(), !running)
      const pilot = pilotRef.current
      const input = () =>
        watching && pilot
          ? heroAutopilot(f, pilot.rand, pilot.skill)
          : readInput()
      if (skipRef.current && running) {
        // SKIP: play the rest of this fight out at once
        skipRef.current = false
        for (let i = 0; i < 60 * 75 && !f.winner; i++) stepFight(f, input())
      }
      for (let i = 0; i < steps * speedRef.current; i++) stepFight(f, input())
      // Call-outs for what just happened
      const now = performance.now()
      const fresh = f.log.slice(logSeen.current)
      // A dodge that blinks shows just BLINK!, not DODGED! / MISS as well
      const blinked = new Set(
        fresh.filter((e) => e.kind === 'blink').map((e) => e.by)
      )
      for (const ev of fresh) {
        const attacker = ev.by === 'hero' ? f.hero : f.enemy
        const target =
          ev.onSummon && f.summon
            ? f.summon
            : ev.by === 'hero'
              ? f.enemy
              : f.hero
        const pop = (x: number, text: string, color: string, big = false) =>
          pops.current.push({
            id: now + Math.random(),
            x,
            text,
            color,
            big,
            born: now,
          })
        if (ev.kind === 'hit' && ev.damage)
          pop(
            target.x,
            `-${ev.damage}`,
            target.side === 'enemy' ? C.gold : C.strText
          )
        else if (ev.kind === 'clash')
          pop((f.hero.x + f.enemy.x) / 2, 'CLASH!', C.gold, true)
        else if (ev.kind === 'dodged' && ev.how === 'block')
          pop(target.x, 'BLOCKED!', C.gold)
        else if (ev.kind === 'dodged' && !blinked.has(target.side))
          pop(target.x, target.side === 'hero' ? 'DODGED!' : 'MISS', C.mist)
        else if (ev.kind === 'counter' && ev.by === 'hero')
          pop(attacker.x, 'COUNTER READY', C.gold)
        else if (ev.kind === 'shove' && !fresh.some((x) => x.how === 'block'))
          pop(target.x, 'SHOVE!', C.gold)
        else if (ev.kind === 'blink') pop(attacker.x, 'BLINK!', C.gold, true)
        else if (ev.kind === 'summon' && f.summon)
          pop(f.summon.x, 'SUMMONED!', SUMMON_TEAL, true)
      }
      logSeen.current = f.log.length
      // Training: on to the next step once this one's done
      const lesson = lessons[stepRef.current]
      if (
        lesson &&
        p === 'fight' &&
        lesson.done(f, fresh, stepStartX.current)
      ) {
        stepRef.current++
        lessons[stepRef.current]?.setup?.(f)
        stepStartX.current = f.hero.x
        if (stepRef.current < lessons.length)
          pops.current.push({
            id: now + Math.random(),
            x: f.hero.x,
            text: 'NICE!',
            color: C.gold,
            big: true,
            born: now,
          })
      }
      pops.current = pops.current.filter((q) => now - q.born < POP_MS)
      if (p === 'fight' && f.winner) setPhase('ko')
      setTick((n) => (n + 1) % 1e6)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
    }
  }, [])

  // Intro, then fight; after the K.O. the swing and the fall play, then the result
  useEffect(() => {
    if (phase === 'intro') {
      if (!sheetsReady) return // GET READY until the sprites are loaded
      const t = setTimeout(() => setPhase('fight'), INTRO_MS)
      return () => clearTimeout(t)
    }
    if (phase === 'ko') {
      const t = setTimeout(() => setPhase('result'), KO_HOLD_MS)
      return () => clearTimeout(t)
    }
  }, [phase, sheetsReady])

  /** Starts fight `i` of the series (the same one again after a loss). */
  const startFight = (i: number) => {
    fightRef.current = makeFight(i)
    pops.current = []
    logSeen.current = 0
    stickUp.current = false
    setIndex(i)
    setRound((r) => r + 1)
    setPhase('intro')
  }
  const again = () => startFight(index)

  // Pause: freezes the clock (the loop only steps while fighting); resume
  // goes back to where it was (a paused intro or K.O. restarts its timer)
  const pausedFrom = useRef<Phase>('fight')
  const pause = () => {
    const p = phaseRef.current
    if (p === 'result' || p === 'paused') return
    pausedFrom.current = p
    setPhase('paused')
  }
  const resume = () => setPhase(pausedFrom.current)
  const [showTips, setShowTips] = useState(false)
  useEffect(() => {
    if (phase !== 'paused') setShowTips(false)
  }, [phase])

  // Training over (finished or skipped): on to the fight it came before
  const leaveTraining = () => {
    if (!asClass) finishTutorial()
    if (next) nav.replace('Fight', next)
    else nav.goBack()
  }
  // Android back = the pause button, nothing else (no leaving mid-fight)
  useBackButton(pause)

  // Finishing a play-through's last fight pays its bonus (once ever)
  useEffect(() => {
    if (
      phase === 'result' &&
      mode === 'play' &&
      expeditionId &&
      lastFight &&
      fightRef.current?.winner === 'hero' &&
      bonus === null
    )
      setBonus(finishPlayThrough(expeditionId))
  }, [phase, expeditionId, lastFight, bonus, finishPlayThrough])

  // A won map encounter pays its gold while today's paid wins last (once)
  const winEncounter = useHero((s) => s.winEncounter)
  const earn = useCamp((s) => s.earn)
  const [encounterPay, setEncounterPay] = useState<number | null>(null)
  useEffect(() => {
    if (phase !== 'result' || mode !== 'encounter' || encounterPay !== null)
      return
    if (fightRef.current?.winner !== 'hero') return setEncounterPay(0)
    const gold = winEncounter() ? encounterGold(opponents[0].level) : 0
    if (gold) earn(gold)
    setEncounterPay(gold)
  }, [phase, mode, encounterPay, winEncounter, earn, opponents])

  // The checkpoint fight records how it went on tonight's expedition (once)
  const answered = useRef(false)
  useEffect(() => {
    if (phase !== 'result' || mode !== 'checkpoint' || answered.current) return
    answered.current = true
    const heroWon = fightRef.current?.winner === 'hero'
    // Watching pays less than taking control (rpg/expedition.ts)
    answer(
      autoCheckpoint
        ? heroWon
          ? 'watch-won'
          : 'watch-lost'
        : heroWon
          ? 'won'
          : 'lost'
    )
  }, [phase, mode, answer])

  const fight = fightRef.current
  const landscape = !!size && size.width > size.height

  // 70/30: the fight above the band, the floor just above the band
  const layout = useMemo(() => {
    if (!size) return null
    const { width: W, height: Hh } = size
    const bandY = Hh * (1 - CONTROLS)
    const floorY = bandY - Math.max(18, Hh * 0.05)
    // The whole arena, always: no camera (a following camera could lose a
    // fighter off screen for a moment)
    const fightH = floorY - (insets.top + 70)
    const s = Math.min(W / ARENA.width, (fightH * 0.9) / 64)
    /** Arena x of the screen's left edge (the arena centred). */
    const camX = (ARENA.width - W / s) / 2
    return { s, floorY, bandY, camX }
  }, [size, insets.top])

  const sx = (x: number) => (layout ? (x - layout.camX) * layout.s : 0)

  const drawFighter = (
    f: Fighter,
    skin: FighterSkin,
    sheetList = f.side === 'hero' ? heroSheets : enemySheets
  ) => {
    if (!layout) return null
    const pose = poseFor(skin, f)
    const flash = f.state === 'hurt' && f.t < 90
    return (
      <FighterSprite
        anim={pose.anim}
        frame={pose.frame}
        facing={f.facing}
        x={sx(f.x)}
        floorY={layout.floorY - f.z * layout.s}
        scale={layout.s}
        sheets={sheetList}
        tint={flash ? '#FFFFFF' : undefined}
        opacity={f.state === 'dodge' ? 0.55 : 1}
      />
    )
  }
  const shadow = (f: Fighter) => {
    if (!layout) return null
    const w = 30 * layout.s * Math.max(0.5, 1 - f.z / 80)
    return (
      <Svg
        pointerEvents="none"
        width={w}
        height={8 * layout.s}
        style={{
          position: 'absolute',
          left: sx(f.x) - w / 2,
          top: layout.floorY - 4 * layout.s,
        }}
      >
        <Ellipse
          cx={w / 2}
          cy={4 * layout.s}
          rx={w / 2}
          ry={3 * layout.s}
          fill="rgba(0,0,0,0.45)"
        />
      </Svg>
    )
  }

  const hero = fight.hero
  const dodgeLeft = Math.max(0, hero.dodgeReadyAt - fight.now)
  const dodgeReady = dodgeLeft === 0
  const counterReady = hero.counterUntil > fight.now
  const now = performance.now()
  const cls = CLASSES[classId]
  const won = fight.winner === 'hero'
  // The K.O. banner fades in as the final swing ends
  const koOpacity =
    fight.endedAt === null
      ? 0
      : Math.max(0, Math.min(1, (fight.now - fight.endedAt - 200) / 450))
  // Whoever is swinging (or standing over the fallen) draws in front
  const heroFront = hero.state === 'attack' || fight.enemy.state === 'ko'
  const bandH = size && layout ? size.height - layout.bandY : 0
  // The stick's touch area starts below the health bars and pause button
  const stickTop = insets.top + 100
  const stickR = Math.max(36, Math.min(56, bandH * 0.42))

  return (
    <BeatProvider bpm={120}>
      <View
        style={styles.root}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout
          setSize((s) =>
            s && s.width === width && s.height === height
              ? s
              : { width, height }
          )
        }}
      >
        {size && layout ? (
          <>
            <Backdrop
              width={size.width}
              height={size.height}
              floorY={layout.floorY}
              bandY={layout.bandY}
            />

            {shadow(fight.enemy)}
            {shadow(hero)}
            {/* The Summoner's summon: a copy of the enemy, on your side */}
            {fight.summon ? (
              <>
                <SummonMark
                  f={fight.summon}
                  x={sx(fight.summon.x)}
                  floorY={layout.floorY}
                  s={layout.s}
                />
                {drawFighter(fight.summon, enemySkin, enemySheets)}
              </>
            ) : null}
            {heroFront ? (
              <>
                {drawFighter(fight.enemy, enemySkin)}
                {drawFighter(hero, heroLook)}
              </>
            ) : (
              <>
                {drawFighter(hero, heroLook)}
                {drawFighter(fight.enemy, enemySkin)}
              </>
            )}

            {/* Arrows, bolts, fireballs, water (rpg/fight.ts projectiles) */}
            {fight.projectiles.map((p) => (
              <ProjectileView
                key={p.id}
                p={p}
                sx={sx}
                floorY={layout.floorY}
                s={layout.s}
              />
            ))}

            {pops.current.map((p) => {
              const age = (now - p.born) / POP_MS
              return (
                <Text
                  key={p.id}
                  pointerEvents="none"
                  style={[
                    styles.pop,
                    {
                      left: sx(p.x) - 70,
                      top: layout.floorY - 84 * layout.s - age * 40,
                      opacity: 1 - age,
                      color: p.color,
                      fontSize: p.big ? 34 : 26,
                    },
                  ]}
                >
                  {p.text}
                </Text>
              )
            })}

            {/* HUD: classic split health bars */}
            <View
              style={[
                styles.hud,
                {
                  top: insets.top + 8,
                  left: insets.left + 12,
                  right: insets.right + 12,
                },
              ]}
            >
              <HealthBar
                name={watching ? 'YOUR HERO' : 'YOU'}
                sub={`${cls.name} · LV ${heroLevel}`}
                share={hpShare(hero)}
                side="left"
              />
              <View style={{ alignItems: 'center', gap: 4 }}>
                <View style={styles.clock}>
                  <Text style={styles.clockText}>
                    {tutorial ? '-' : timeLeft(fight)}
                  </Text>
                </View>
                {series ? (
                  <T f="body700" size={10} ls={0.1} color={C.steelLight}>
                    {index + 1}/{opponents.length}
                  </T>
                ) : null}
              </View>
              <HealthBar
                name={enemyName.toUpperCase()}
                sub={`LV ${level}`}
                share={hpShare(fight.enemy)}
                side="right"
              />
            </View>
            <View
              style={{
                position: 'absolute',
                top: insets.top + 58,
                right: insets.right + 12,
              }}
            >
              <IconButton
                icon="pause"
                label="Pause"
                size={38}
                iconSize={14}
                onPress={pause}
              />
            </View>

            {/* Controls band: stick on the left, buttons on the right
                (WATCH: the speed and skip instead) */}
            {watching ? (
              <View
                style={[
                  styles.watchBand,
                  {
                    top: layout.bandY,
                    left: insets.left + 16,
                    right: insets.right + 16,
                    bottom: insets.bottom,
                  },
                ]}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <T f="body800" size={12} ls={0.14} color={C.gold}>
                    {autoCheckpoint
                      ? 'YOUR HERO FIGHTS ALONE'
                      : 'WATCHING THE REPLAY'}
                  </T>
                  <T size={12} color={C.mist}>
                    {autoCheckpoint
                      ? autoCheckpoint.boosted
                        ? `Boosted: +${Math.round(CHECKPOINT_BOOST * 100)}% odds from your set.`
                        : 'No boost set this time. Hands off: see what happens.'
                      : `Battle ${index + 1} of ${opponents.length}, as it happened that night.`}
                  </T>
                </View>
                <CrimsonButton
                  label={speed === 1 ? '2× SPEED' : '1× SPEED'}
                  height={42}
                  fontSize={14}
                  onPress={() => {
                    speedRef.current = speed === 1 ? 2 : 1
                    setSpeed(speedRef.current)
                  }}
                />
                <GoldButton
                  label="SKIP"
                  height={38}
                  fontSize={14}
                  trackWidth={120}
                  onPress={() => (skipRef.current = true)}
                />
              </View>
            ) : (
              <>
                <T
                  size={10}
                  ls={0.12}
                  color={C.steelLight}
                  style={{
                    position: 'absolute',
                    left: insets.left + 16,
                    top: layout.bandY + 8,
                  }}
                >
                  TOUCH ANYWHERE ON THE LEFT · PUSH UP TO JUMP
                </T>
                {/* Always on screen, resting in the band; a thumb anywhere
                    on the left half (below the bars) picks it up there */}
                <Joystick
                  vectorRef={stickRef}
                  alwaysShown
                  radius={stickR}
                  home={{
                    x: insets.left + 16 + stickR,
                    y: layout.bandY - stickTop + bandH / 2,
                  }}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: stickTop,
                    bottom: 0,
                    width: size.width * 0.5,
                  }}
                />
                <View
                  pointerEvents="box-none"
                  style={[
                    styles.buttons,
                    {
                      right: insets.right + 18,
                      top: layout.bandY,
                      bottom: insets.bottom,
                    },
                  ]}
                >
                  <ActionButton
                    label={
                      dodgeReady
                        ? hero.stats.block
                          ? 'BLOCK'
                          : 'DODGE'
                        : 'WAIT'
                    }
                    icon="retreat"
                    size={Math.min(70, bandH * 0.5)}
                    bg={dodgeReady ? C.gold : C.iron}
                    fg={dodgeReady ? C.floor : C.steelLight}
                    border={dodgeReady ? C.chalk : C.steel}
                    drain={dodgeLeft / hero.stats.dodgeCooldownMs}
                    onPress={onDodge}
                  />
                  <ActionButton
                    label={counterReady ? 'COUNTER' : 'ATTACK'}
                    icon="swords"
                    size={Math.min(96, bandH * 0.72)}
                    bg={C.crimson}
                    fg={C.chalk}
                    border={counterReady ? C.gold : C.deepRed}
                    onPress={onAttack}
                  />
                </View>
              </>
            )}

            {/* Combat training: the current step's prompt */}
            {tutorial && phase === 'fight' && lessons[stepRef.current] ? (
              <View
                pointerEvents="box-none"
                style={[
                  styles.lesson,
                  {
                    top: insets.top + 104,
                    left: insets.left + 24,
                    right: insets.right + 24,
                  },
                ]}
              >
                <View pointerEvents="none" style={{ flex: 1, gap: 2 }}>
                  <T f="body800" size={11} ls={0.14} color={C.gold}>
                    {stepRef.current + 1}/{lessons.length} ·{' '}
                    {lessons[stepRef.current].title}
                  </T>
                  <T size={14} lh={1.35} color={C.chalk}>
                    {lessons[stepRef.current].text}
                  </T>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Skip combat training"
                  hitSlop={10}
                  onPress={leaveTraining}
                  style={{ paddingHorizontal: 6, paddingVertical: 4 }}
                >
                  <T f="body700" size={11} ls={0.1} color={C.steelLight}>
                    SKIP
                  </T>
                </Pressable>
              </View>
            ) : null}

            {/* Banners */}
            {phase === 'intro' ? (
              <View pointerEvents="none" style={styles.banner}>
                <Text style={styles.bannerSmall}>
                  {tutorial
                    ? 'COMBAT TRAINING'
                    : autoCheckpoint
                      ? 'YOUR HERO VS THE BRUTE'
                      : watching
                        ? `REPLAY · BATTLE ${index + 1} OF ${opponents.length}`
                        : mode === 'checkpoint'
                          ? 'THE BRUTE BLOCKS THE PATH'
                          : mode === 'encounter'
                            ? `A WILD ${enemyName.toUpperCase()}`
                            : series
                              ? `FIGHT ${index + 1} OF ${opponents.length}`
                              : `ROUND ${round}`}
                </Text>
                <Text style={styles.bannerBig}>
                  {sheetsReady ? 'FIGHT!' : 'GET READY'}
                </Text>
              </View>
            ) : null}
            {phase === 'ko' ? (
              <View
                pointerEvents="none"
                style={[styles.banner, { opacity: koOpacity }]}
              >
                <Text
                  style={[
                    styles.bannerBig,
                    { color: won ? C.gold : C.crimson },
                  ]}
                >
                  K.O.
                </Text>
              </View>
            ) : null}
            {phase === 'paused' ? (
              <View style={styles.resultWrap}>
                <View style={styles.result}>
                  <H size={34} lh={1} skew>
                    PAUSED
                  </H>
                  <T size={13} color={C.mist}>
                    {enemyName} · level {level}
                    {series
                      ? ` · fight ${index + 1} of ${opponents.length}`
                      : ''}
                  </T>
                  <GoldButton
                    label="RESUME"
                    icon="play"
                    height={46}
                    fontSize={18}
                    trackWidth={300}
                    onPress={resume}
                  />
                  <CrimsonButton
                    label={showTips ? 'HIDE TIPS' : 'HOW TO FIGHT'}
                    icon="sparkles"
                    height={44}
                    fontSize={16}
                    onPress={() => setShowTips((v) => !v)}
                  />
                  <CrimsonButton
                    label="SETTINGS"
                    icon="settings"
                    height={44}
                    fontSize={16}
                    onPress={() => nav.navigate('Settings')}
                  />
                  <CrimsonButton
                    label={
                      tutorial
                        ? 'SKIP TRAINING'
                        : mode === 'checkpoint'
                          ? 'DECIDE LATER'
                          : mode === 'encounter'
                            ? 'RUN AWAY'
                            : expeditionId
                              ? 'QUIT TO REPLAYS'
                              : 'QUIT FIGHT'
                    }
                    icon="x"
                    height={44}
                    fontSize={16}
                    onPress={() => (tutorial ? leaveTraining() : nav.goBack())}
                  />
                </View>
                {/* HOW TO FIGHT: a pop-out over the menu; tap to close */}
                {showTips ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close the fighting tips"
                    onPress={() => setShowTips(false)}
                    style={styles.tipsWrap}
                  >
                    <View style={styles.tips}>
                      <T f="display" size={20} ls={0.04} color={C.gold}>
                        HOW TO FIGHT · {cls.name.toUpperCase()}
                      </T>
                      {FIGHT_TIPS[classId].map((tip) => (
                        <View key={tip} style={styles.tipRow}>
                          <View style={styles.tipDot} />
                          <T
                            size={14}
                            lh={1.4}
                            color={C.chalk}
                            style={{ flex: 1 }}
                          >
                            {tip}
                          </T>
                        </View>
                      ))}
                      <T f="body700" size={11} ls={0.12} color={C.mist}>
                        TAP ANYWHERE TO CLOSE
                      </T>
                    </View>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
            {phase === 'result' ? (
              <View style={styles.resultWrap}>
                <View style={styles.result}>
                  <H size={34} lh={1} skew color={won ? C.gold : C.crimson}>
                    {tutorial
                      ? 'TRAINING COMPLETE'
                      : mode === 'checkpoint'
                        ? won
                          ? 'THE PATH IS CLEAR'
                          : 'THE BRUTE WINS'
                        : watching
                          ? won
                            ? 'WON'
                            : 'LOST'
                          : !won
                            ? 'DEFEATED'
                            : mode === 'play' && lastFight
                              ? 'RUN COMPLETE'
                              : 'VICTORY'}
                  </H>
                  {mode === 'encounter' ? (
                    <T f="body700" size={14} color={won ? C.gold : C.mist}>
                      {!won
                        ? 'No gold this time, and nothing lost. Back on the trail.'
                        : encounterPay
                          ? `+${encounterPay} gold`
                          : 'Practice fight: today’s paid wins are used up. More tomorrow.'}
                    </T>
                  ) : null}
                  {mode === 'checkpoint' ? (
                    <T f="body700" size={14} color={won ? C.gold : C.hype}>
                      {won
                        ? autoCheckpoint
                          ? `+${Math.round((CHECKPOINT_WATCH_WIN.gold - 1) * 100)}% gold for the rest of tonight (take control next time for +${Math.round((CHECKPOINT_WIN.gold - 1) * 100)}%).`
                          : `+${Math.round((CHECKPOINT_WIN.gold - 1) * 100)}% gold and better odds for the rest of tonight.`
                        : 'Your hero presses on, hurt: less gold and tougher fights tonight.'}
                    </T>
                  ) : null}
                  {won && mode === 'play' && lastFight ? (
                    <T f="body700" size={15} color={C.gold}>
                      {bonus
                        ? `Play-through bonus: +${bonus} gold`
                        : 'Bonus already collected for this expedition.'}
                    </T>
                  ) : null}
                  <T size={14} lh={1.45} color={C.mist}>
                    {won
                      ? `${watching ? 'Your hero' : 'You'} beat the ${enemyName.toLowerCase()} with ${Math.round(hpShare(hero) * 100)}% health left.`
                      : `The ${enemyName.toLowerCase()} won this one. Dodge or jump its swing to leave it open, then hit back.`}
                  </T>
                  <T f="body700" size={12} color={C.steelLight}>
                    Hits landed: {heroHits(fight)} · Swings avoided:{' '}
                    {heroDodges(fight)}
                  </T>
                  {tutorial ? (
                    <GoldButton
                      label={next ? 'ON TO THE FIGHT' : 'DONE'}
                      height={46}
                      fontSize={18}
                      trackWidth={300}
                      onPress={leaveTraining}
                    />
                  ) : mode === 'checkpoint' ||
                    mode === 'encounter' ? null : watching ? (
                    !lastFight ? (
                      <GoldButton
                        label={`NEXT BATTLE · ${index + 2} OF ${opponents.length}`}
                        height={46}
                        fontSize={17}
                        trackWidth={300}
                        onPress={() => startFight(index + 1)}
                      />
                    ) : null
                  ) : won && !lastFight ? (
                    <GoldButton
                      label={`NEXT FIGHT · ${index + 2} OF ${opponents.length}`}
                      height={46}
                      fontSize={17}
                      trackWidth={300}
                      onPress={() => startFight(index + 1)}
                    />
                  ) : won && expeditionId ? null : (
                    <GoldButton
                      label={won ? 'FIGHT AGAIN' : 'TRY AGAIN'}
                      height={46}
                      fontSize={18}
                      trackWidth={300}
                      onPress={again}
                    />
                  )}
                  {tutorial ? null : (
                    <CrimsonButton
                      label={
                        mode === 'checkpoint'
                          ? 'BACK TO CAMP'
                          : mode === 'encounter'
                            ? 'BACK TO THE MAP'
                            : expeditionId
                              ? 'BACK TO REPLAYS'
                              : 'BACK'
                      }
                      height={44}
                      fontSize={16}
                      onPress={() => nav.goBack()}
                    />
                  )}
                </View>
              </View>
            ) : null}
          </>
        ) : null}
      </View>
    </BeatProvider>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.floorDeep },
  hud: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  clock: {
    minWidth: 52,
    height: 40,
    borderRadius: 8,
    backgroundColor: C.iron,
    borderWidth: 2,
    borderColor: C.steel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockText: {
    fontFamily: F.num,
    fontSize: 30,
    color: C.chalk,
    lineHeight: 34,
    paddingTop: 4,
  },
  tipsWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(11,11,13,0.45)',
  },
  /** Like the crimson buttons: skewed, red, see-through. */
  tips: {
    width: 360,
    maxWidth: '100%',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(200,16,46,0.72)',
    borderWidth: 1.5,
    borderColor: C.gold,
    transform: [{ skewX: SKEW }],
  },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  tipDot: {
    width: 7,
    height: 7,
    marginTop: 7,
    backgroundColor: C.gold,
    transform: [{ rotate: '45deg' }],
  },
  lesson: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(17,17,20,0.72)',
    borderWidth: 1,
    borderColor: C.steel,
  },
  watchBand: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  buttons: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  btnLabel: {
    fontFamily: F.body800,
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 2,
  },
  pop: {
    position: 'absolute',
    width: 140,
    textAlign: 'center',
    fontFamily: F.num,
    textShadowColor: '#000',
    textShadowRadius: 4,
  },
  banner: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerSmall: {
    fontFamily: F.display,
    fontSize: 24,
    color: C.mist,
    letterSpacing: 2,
  },
  bannerBig: {
    fontFamily: F.display,
    fontSize: 72,
    color: C.chalk,
    letterSpacing: 3,
    textShadowColor: C.crimson,
    textShadowRadius: 10,
    transform: [{ skewX: '-6deg' }],
  },
  resultWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(11,11,13,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  result: {
    width: 340,
    maxWidth: '100%',
    gap: 10,
    padding: 16,
    borderRadius: 16,
    backgroundColor: C.floor,
    borderWidth: 1,
    borderColor: C.gold,
  },
})
