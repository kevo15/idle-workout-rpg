// Expeditions (docs/game-flow.md §6). Pure functions over expedition records;
// src/state/useCamp.ts persists them.
//
// PLACEHOLDER RESULTS: `placeholderResult` makes believable, seeded numbers
// (battles, wins, gold) so the Camp screens can be played end to end. It is
// replaced by the deterministic combat simulation (roadmap §3.3) later; the
// record shapes and the rules here (approach → enemy level, checkpoints,
// once-only claims) stay.

import { seeded } from './rng'
import type { StatKey } from './types'
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

export interface CheckpointOption {
  id: 'strike' | 'guard' | 'retreat'
  title: string
  sub: string
}

/** The decision an expedition stops for (one per expedition for now). */
export const CHECKPOINT = {
  title: 'A BRUTE BLOCKS THE PATH',
  sub: 'Your hero holds position until you decide.',
  options: [
    { id: 'strike', title: 'HEAVY STRIKE', sub: 'Big hit, slow to recover' },
    { id: 'guard', title: 'GUARD', sub: 'Block the first blow, then counter' },
    {
      id: 'retreat',
      title: 'RETREAT TO CAMP',
      sub: 'End the expedition and keep your gold',
    },
  ] as CheckpointOption[],
}

/** What the hero does if the player never answers (offline default). */
export const DEFAULT_CALL: Record<Approach, CheckpointOption['id']> = {
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
  /** The player's checkpoint answer, if given. */
  call?: CheckpointOption['id']
}

export interface ExpeditionResult {
  battles: number
  won: number
  gold: number
  /** Hours actually explored (a retreat ends early). */
  hours: number
  call: CheckpointOption['id']
}

export function newExpedition(input: {
  id: string
  site: CampSite
  approach: Approach
  heroLevel: number
  warmup: boolean
  now: number
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
  const winRate = Math.max(
    0.35,
    Math.min(0.97, 0.8 + edge * 0.07 + (e.warmup ? WARMUP_WIN_BONUS : 0))
  )
  let won = 0
  for (let i = 0; i < battles; i++) if (rand() < winRate) won++
  const strike = call === 'strike' ? 1.1 : 1
  const perWin = 15 + 5 * e.enemyLevel
  const gold = Math.round(
    won * perWin * info.gold * strike * (e.warmup ? 1 + WARMUP_GOLD_BONUS : 1)
  )
  return { battles, won, gold, hours, call }
}

/** Bonus gold for playing an expedition through once from REPLAY. */
export const playThroughBonus = (r: ExpeditionResult) =>
  Math.max(10, Math.round(r.gold * 0.25))

/** A short warm-up set: 1 set of the class's signature movement. */
export const WARMUP_EXERCISE: Record<string, string> = {
  warrior: 'squats',
  archer: 'side-steps',
}

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

/** The battle at which the checkpoint decision comes up. */
export const checkpointBattle = (battles: number) =>
  Math.min(battles - 1, Math.max(1, Math.floor(battles / 4)))
