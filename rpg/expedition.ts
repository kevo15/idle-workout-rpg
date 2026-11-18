// Expeditions (docs/game-flow.md §6). Pure functions over expedition records;
// src/state/useCamp.ts persists them.
//
// RESULTS: `expeditionResult` fights every battle of the night with the
// fight engine (rpg/fight.ts, the hero on autopilot) using the hero's stats
// and class from when they set out. Old saves without that snapshot fall
// back to the earlier estimate (`placeholderResult`).
//
// (Earlier) PLACEHOLDER RESULTS: `placeholderResult` makes believable, seeded numbers
// (battles, wins, gold) so the Camp screens can be played end to end. It is
// replaced by the deterministic combat simulation (roadmap §3.3) later; the
// record shapes and the rules here (approach → enemy level, checkpoints,
// once-only claims) stay.

import { PRIMARY_EXERCISES, WARMUPS } from './exercises'
import {
  enemyFighter,
  EXPEDITION_SKILL,
  heroFighter,
  kindOf,
  simulate,
} from './fight'
import { seeded } from './rng'
import type { ClassId, StatKey } from './types'
import type { CampSite } from './world'

/** How the hero approaches the area, relative to their class level. */
export type Approach = 'CAUTIOUS' | 'BALANCED' | 'AGGRESSIVE'

export interface ApproachInfo {
  id: Approach
  label: string
  /** Enemy level relative to the hero's class level. */
  offset: number
  /** Gold multiplier. */
  gold: number
  desc: string
}

export const APPROACHES: ApproachInfo[] = [
  {
    id: 'CAUTIOUS',
    label: 'CAUTIOUS',
    offset: -2,
    gold: 0.7,
    desc: 'Enemies below your level. Safe, steady, smaller rewards.',
  },
  {
    id: 'BALANCED',
    label: 'BALANCED',
    offset: 0,
    gold: 1,
    desc: 'Enemies at your level. Even fights, normal rewards.',
  },
  {
    id: 'AGGRESSIVE',
    label: 'AGGRESSIVE',
    offset: 2,
    gold: 1.5,
    desc: 'Enemies above your level. More gold and rare finds, more risk.',
  },
]

export const approachInfo = (id: Approach) =>
  APPROACHES.find((a) => a.id === id)!

/** Expeditions run for this long (roadmap §3.1: 8h duration limit). */
export const EXPEDITION_HOURS = 8
export const EXPEDITION_MS = EXPEDITION_HOURS * 3600_000
/** The checkpoint comes up this far into the expedition. */
const CHECKPOINT_AT = 1 / 8

/**
 * Warming up before departure buffs that one expedition only: more loot and
 * a slightly better chance to win each fight. It never raises stats or the
 * hero's level (docs/game-flow.md §6.5).
 */
export const WARMUP_GOLD_BONUS = 0.15
export const WARMUP_WIN_BONUS = 0.05

/** Enemy level for an approach, kept inside the camp site's band. */
export function enemyLevel(
  heroLevel: number,
  site: CampSite,
  approach: Approach
) {
  const [min, max] = site.levelBand
  return Math.max(min, Math.min(max, heroLevel + approachInfo(approach).offset))
}

/**
 * How the checkpoint went: the player ran (`retreat`), or the Brute was
 * fought (`won` / `lost`), by the player taking control or by watching the
 * hero fight it alone; if nobody answers, the hero handles it offline
 * (`guard` or `strike`, from the approach).
 */
export type ExpeditionCall =
  | 'retreat'
  | 'won'
  | 'lost'
  /** WATCH: the hero fought the Brute alone. */
  | 'watch-won'
  | 'watch-lost'
  | 'guard'
  | 'strike'

export interface CheckpointOption {
  id: 'fight' | 'watch' | 'retreat'
  title: string
  sub: string
}

/** The decision an expedition stops for (one per expedition for now). */
export const CHECKPOINT = {
  title: 'A BRUTE BLOCKS THE PATH',
  sub: 'Your hero holds position until you decide.',
  /** The Brute you fight when you take control. */
  enemy: 'Brute',
  options: [
    {
      id: 'fight',
      title: 'TAKE CONTROL',
      sub: 'Fight the Brute yourself. Win for more gold tonight.',
    },
    {
      id: 'watch',
      title: 'WATCH IT PLAY OUT',
      sub: 'Your hero fights alone for less gold. A quick set first boosts their odds.',
    },
    {
      id: 'retreat',
      title: 'RETURN TO CAMP',
      sub: 'Run away: end the night now and keep your gold.',
    },
  ] as CheckpointOption[],
}

/** Taking control: winning the Brute fight boosts the rest of the night. */
export const CHECKPOINT_WIN = { gold: 1.25, winRate: 0.05 }
/** Losing it: the hero presses on, hurt. */
export const CHECKPOINT_LOSS = { gold: 0.9, winRate: -0.1 }
/** WATCH: a win the hero managed alone pays less than taking control. */
export const CHECKPOINT_WATCH_WIN = { gold: 1.1, winRate: 0.03 }

/** WATCH: a set before the fight raises the hero's odds by this much. */
export const CHECKPOINT_BOOST = 0.3

/**
 * WATCH: the chance the hero beats the Brute alone. Even odds at the same
 * level, better or worse by level gap; the boost set adds CHECKPOINT_BOOST.
 */
export function checkpointWatchChance(
  heroLevel: number,
  enemyLevel: number,
  boosted: boolean
) {
  const base = 0.5 + (heroLevel - enemyLevel) * 0.08
  return Math.max(0.15, Math.min(0.9, base + (boosted ? CHECKPOINT_BOOST : 0)))
}

/**
 * WATCH: how the hero's own fight goes, decided once per expedition (and
 * boost), so watching again shows the same ending.
 */
export function checkpointWatchWins(e: Expedition, boosted: boolean) {
  const rand = seeded(`checkpoint-watch:${e.id}`)
  return rand() < checkpointWatchChance(e.heroLevel, e.enemyLevel, boosted)
}

/**
 * WATCH: the boost set, one of the class's exercises other than its
 * warm-up (so it's a different exercise), the same for the whole night.
 */
export function checkpointBoostExercise(e: Expedition, classId: string) {
  const own = PRIMARY_EXERCISES.filter(
    (x) =>
      (x.classAffinity as string[]).includes(classId) &&
      x.id !== WARMUPS[classId]
  )
  const pool = own.length ? own : PRIMARY_EXERCISES
  const rand = seeded(`checkpoint-boost:${e.id}`)
  return pool[Math.floor(rand() * pool.length)].id
}

/** What the hero does if the player never answers (offline default). */
export const DEFAULT_CALL: Record<Approach, ExpeditionCall> = {
  CAUTIOUS: 'guard',
  BALANCED: 'guard',
  AGGRESSIVE: 'strike',
}

export interface Expedition {
  id: string
  siteId: string
  approach: Approach
  heroLevel: number
  enemyLevel: number
  startedAt: number
  durationMs: number
  /** Warmed up before departure (loot boost). */
  warmup: boolean
  /** How the checkpoint went, once answered. */
  call?: ExpeditionCall
  /** The hero as they set out (the night is fought with these). */
  heroStats?: Record<StatKey, number>
  classId?: ClassId
}

/** One battle of a night, as fought (replay it with the seed and skill). */
export interface BattleRecord {
  enemy: string
  level: number
  won: boolean
  /** Null for the checkpoint Brute when the player decided it. */
  seed: string | null
  skill: number
}

export interface ExpeditionResult {
  battles: number
  won: number
  gold: number
  /** Hours actually explored (a retreat ends early). */
  hours: number
  call: ExpeditionCall
  /** Every battle, in order (missing on results from before the sim). */
  records?: BattleRecord[]
}

export function newExpedition(input: {
  id: string
  site: CampSite
  approach: Approach
  heroLevel: number
  warmup: boolean
  now: number
  heroStats?: Record<StatKey, number>
  classId?: ClassId
}): Expedition {
  return {
    id: input.id,
    siteId: input.site.id,
    approach: input.approach,
    heroLevel: input.heroLevel,
    enemyLevel: enemyLevel(input.heroLevel, input.site, input.approach),
    startedAt: input.now,
    durationMs: EXPEDITION_MS,
    warmup: input.warmup,
    heroStats: input.heroStats,
    classId: input.classId,
  }
}

export type ExpeditionPhase = 'RUNNING' | 'WAITING' | 'DONE'

/** Where an expedition stands at time `now`. */
export function phaseAt(e: Expedition, now: number): ExpeditionPhase {
  if (e.call === 'retreat') return 'DONE'
  const elapsed = now - e.startedAt
  if (elapsed >= e.durationMs) return 'DONE'
  if (!e.call && elapsed >= e.durationMs * CHECKPOINT_AT) return 'WAITING'
  return 'RUNNING'
}

/** 0..1 through the expedition (a waiting checkpoint doesn't stop the clock). */
export const progressAt = (e: Expedition, now: number) =>
  Math.max(0, Math.min(1, (now - e.startedAt) / e.durationMs))

/** Gold for each battle won against enemies of `level`. */
export const goldPerWin = (level: number) => 15 + 5 * level

/** PLACEHOLDER: seeded, plausible results until the combat sim exists. */
export function placeholderResult(e: Expedition): ExpeditionResult {
  const rand = seeded(`expedition:${e.id}`)
  const call = e.call ?? DEFAULT_CALL[e.approach]
  const hours = call === 'retreat' ? 1 : EXPEDITION_HOURS
  const info = approachInfo(e.approach)
  const battles = Math.max(
    1,
    Math.round(
      (call === 'retreat' ? 2 : 12 + Math.floor(rand() * 5)) *
        (e.approach === 'AGGRESSIVE' ? 1.2 : 1)
    )
  )
  // Harder fights (enemy above hero) win less often.
  const edge = e.heroLevel - e.enemyLevel
  const fought =
    call === 'won'
      ? CHECKPOINT_WIN
      : call === 'watch-won'
        ? CHECKPOINT_WATCH_WIN
        : call === 'lost' || call === 'watch-lost'
          ? CHECKPOINT_LOSS
          : null
  const winRate = Math.max(
    0.35,
    Math.min(
      0.97,
      0.8 +
        edge * 0.07 +
        (e.warmup ? WARMUP_WIN_BONUS : 0) +
        (fought?.winRate ?? 0)
    )
  )
  let won = 0
  for (let i = 0; i < battles; i++) if (rand() < winRate) won++
  const callGold = fought?.gold ?? (call === 'strike' ? 1.1 : 1)
  const gold = Math.round(
    won *
      goldPerWin(e.enemyLevel) *
      info.gold *
      callGold *
      (e.warmup ? 1 + WARMUP_GOLD_BONUS : 1)
  )
  return { battles, won, gold, hours, call }
}

/** The checkpoint call's effect on the night: gold and autopilot skill. */
function callEffect(call: ExpeditionCall) {
  const fought =
    call === 'won'
      ? CHECKPOINT_WIN
      : call === 'watch-won'
        ? CHECKPOINT_WATCH_WIN
        : call === 'lost' || call === 'watch-lost'
          ? CHECKPOINT_LOSS
          : null
  return {
    gold: fought?.gold ?? (call === 'strike' ? 1.1 : 1),
    // A win-rate bump of 5% is about +0.1 autopilot skill
    skill: (fought?.winRate ?? 0) * 2,
  }
}

/**
 * The night, fought: every battle simulated with the fight engine, the hero
 * (as they set out) on autopilot at EXPEDITION_SKILL, sharper after a warm-up
 * and after winning the checkpoint, worse after losing it. The checkpoint
 * Brute ends the way the player's own fight (or the watched one) did; left
 * unanswered, the hero fights it alone. Seeded by the expedition: claiming
 * it gives the same night every time.
 */
export function expeditionResult(
  e: Expedition,
  site: CampSite
): ExpeditionResult {
  if (!e.heroStats) return placeholderResult(e)
  const rand = seeded(`expedition:${e.id}`)
  const call = e.call ?? DEFAULT_CALL[e.approach]
  const hours = call === 'retreat' ? 1 : EXPEDITION_HOURS
  const info = approachInfo(e.approach)
  const battles = Math.max(
    1,
    Math.round(
      (call === 'retreat' ? 2 : 12 + Math.floor(rand() * 5)) *
        (e.approach === 'AGGRESSIVE' ? 1.2 : 1)
    )
  )
  const effect = callEffect(call)
  const hero = heroFighter(e.heroStats, e.classId ?? 'warrior')
  const cp = call === 'retreat' ? -1 : checkpointBattle(battles)
  const decided =
    call === 'won' ||
    call === 'lost' ||
    call === 'watch-won' ||
    call === 'watch-lost'
  const base = EXPEDITION_SKILL + (e.warmup ? WARMUP_WIN_BONUS * 2 : 0)
  const records: BattleRecord[] = []
  for (let i = 0; i < battles; i++) {
    const enemy =
      i === cp
        ? CHECKPOINT.enemy
        : site.enemies[Math.floor(rand() * site.enemies.length)]
    const skill = Math.max(0, Math.min(1, base + (i > cp ? effect.skill : 0)))
    if (i === cp && decided) {
      records.push({
        enemy,
        level: e.enemyLevel,
        won: call === 'won' || call === 'watch-won',
        seed: null,
        skill,
      })
      continue
    }
    const seed = `night:${e.id}:${i}`
    const f = simulate(
      {
        hero,
        enemy: enemyFighter(kindOf(enemy), e.enemyLevel),
        enemyLevel: e.enemyLevel,
      },
      { seed, skill }
    )
    records.push({
      enemy,
      level: e.enemyLevel,
      won: f.winner === 'hero',
      seed,
      skill,
    })
  }
  const won = records.filter((r) => r.won).length
  const gold = Math.round(
    won *
      goldPerWin(e.enemyLevel) *
      info.gold *
      effect.gold *
      (e.warmup ? 1 + WARMUP_GOLD_BONUS : 1)
  )
  return { battles, won, gold, hours, call, records }
}

/** Bonus gold for playing an expedition through once from REPLAY. */
export const playThroughBonus = (r: ExpeditionResult) =>
  Math.max(10, Math.round(r.gold * 0.25))

/**
 * A short warm-up set: 1 set of the class's signature movement. Set per
 * class in rpg/data/workouts.json ("warmups").
 */
export const WARMUP_EXERCISE: Record<string, string> = WARMUPS

export interface PlaceholderBattle {
  enemy: string
  won: boolean
}

/**
 * PLACEHOLDER: a battle-by-battle breakdown matching a result's totals, for
 * WATCH and PLAY THROUGH until the combat sim records real events.
 */
export function placeholderBattles(
  e: Expedition,
  r: ExpeditionResult,
  site: CampSite
): PlaceholderBattle[] {
  const rand = seeded(`battles:${e.id}`)
  const wins = Array.from({ length: r.battles }, (_, i) => i < r.won)
  for (let i = wins.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[wins[i], wins[j]] = [wins[j], wins[i]]
  }
  return wins.map((won) => ({
    enemy: site.enemies[Math.floor(rand() * site.enemies.length)],
    won,
  }))
}

/**
 * PLAY THROUGH: the key battles of a logged expedition to fight by hand (the
 * first, the checkpoint and the last, at most 3), at its enemy level. The
 * checkpoint fight is the Brute that blocked the path.
 */
export function playThroughFights(
  e: Expedition,
  r: ExpeditionResult,
  site: CampSite
): {
  enemy: string
  level: number
  won: boolean
  /** The recorded fight to replay exactly, when there is one. */
  plan?: { seed: string; skill: number }
}[] {
  if (r.records?.length) {
    const recs = r.records
    const cp = checkpointBattle(recs.length)
    const picks = [...new Set([0, cp, recs.length - 1])].filter(
      (i) => i >= 0 && i < recs.length
    )
    return picks.map((i) => {
      const b = recs[i]
      return {
        enemy: b.enemy,
        level: b.level,
        won: b.won,
        plan: b.seed ? { seed: b.seed, skill: b.skill } : undefined,
      }
    })
  }
  const battles = placeholderBattles(e, r, site)
  if (battles.length === 0)
    return [{ enemy: site.enemies[0], level: e.enemyLevel, won: false }]
  const cp = checkpointBattle(battles.length)
  const picks = [...new Set([0, cp, battles.length - 1])].filter(
    (i) => i >= 0 && i < battles.length
  )
  return picks.map((i) => ({
    enemy: i === cp ? CHECKPOINT.enemy : battles[i].enemy,
    level: e.enemyLevel,
    // The checkpoint Brute: how the player's own fight went, if they took
    // control; otherwise how the battle went
    won:
      i === cp &&
      (r.call === 'won' ||
        r.call === 'lost' ||
        r.call === 'watch-won' ||
        r.call === 'watch-lost')
        ? r.call === 'won' || r.call === 'watch-won'
        : battles[i].won,
  }))
}

/** The battle at which the checkpoint decision comes up. */
export const checkpointBattle = (battles: number) =>
  Math.min(battles - 1, Math.max(1, Math.floor(battles / 4)))
