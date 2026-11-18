// The quest planner (docs/game-flow.md §2). Pure and seeded: the same profile,
// class, date and history always give the same day (T01).
//
// Quests arrive in batches through the day: 3 at midnight, then a fresh batch
// of 2–3 every 2–4 hours (seeded). Each batch replaces the last: its quests
// stay open until the next batch arrives. Rewarded ads can add up to
// MAX_AD_QUESTS extra quests a day, open until midnight.
//
// Rules for picking each quest's exercise:
//   1. Don't repeat the movement pattern of the previous two quests (so a
//      batch of 3 never repeats a pattern).
//   2. Avoid yesterday's patterns early in the day where possible.
//   3. Class weighting: about 60% CLASS quests, 40% WORLD.
// Easier swaps keep the quest's reward (T02, T32).

import type { ClassId, StatKey } from './types'
import {
  PRIMARY_EXERCISES,
  getExercise,
  type Exercise,
  type MovementPattern,
} from './exercises'
import { seeded } from './rng'

/** Minutes between batches: 2 to 4 hours. */
export const QUEST_GAP_MIN = 120
export const QUEST_GAP_MAX = 240
export const MINUTES_PER_DAY = 1440
/** Quests in the day's first batch, at midnight. */
export const FIRST_BATCH = 3
/** Quests in each later batch. */
export const BATCH_MIN = 2
export const BATCH_MAX = 3
/** Most batches a day can hold (every gap at its shortest). */
export const MAX_BATCHES = MINUTES_PER_DAY / QUEST_GAP_MIN
/** Most scheduled quests a day can hold. */
export const MAX_SCHEDULED_QUESTS = FIRST_BATCH + (MAX_BATCHES - 1) * BATCH_MAX
/** Extra quests rewarded ads can unlock each day. */
export const MAX_AD_QUESTS = 2
/** Chance a scheduled quest is a CLASS quest. */
/** Share of quests (and map encounters) that are CLASS workouts. */
export const CLASS_SHARE = 0.6

export type QuestTrack = 'CLASS' | 'WORLD'
export type QuestKind = 'scheduled' | 'ad'

export interface Quest {
  /** `${date}:${slot}`: unique per day, stable for idempotent completion. */
  id: string
  date: string
  slot: number
  kind: QuestKind
  /** Which batch of the day it arrived in (ad quests: -1). */
  batch: number
  track: QuestTrack
  /** Minutes after midnight the quest opens (ad quests: when unlocked). */
  opensAt: number
  /** Minutes after midnight it closes: the next batch's arrival, or midnight. */
  closesAt: number
  /** The planned exercise (before any swap). */
  exerciseId: string
  reward: { stat: StatKey; amount: number }
}

export interface PlanInput {
  classId: ClassId
  /** Local date, YYYY-MM-DD. */
  date: string
  /** Per-player seed so two players don't get identical days. */
  profileId: string
  /** Movement patterns trained yesterday (avoided early in the day). */
  recentPatterns?: MovementPattern[]
}

/** Seeded batch arrival times for the day, in minutes after midnight. */
export function questTimes(rand: () => number): number[] {
  const times: number[] = []
  let t = 0
  while (t < MINUTES_PER_DAY) {
    times.push(t)
    t +=
      QUEST_GAP_MIN + Math.floor(rand() * (QUEST_GAP_MAX - QUEST_GAP_MIN + 1))
  }
  return times
}

/** Plans the day's scheduled quests, then the MAX_AD_QUESTS ad slots. */
export function planDay({
  classId,
  date,
  profileId,
  recentPatterns = [],
}: PlanInput): Quest[] {
  const rand = seeded(`${profileId}:${classId}:${date}`)
  const times = questTimes(rand)
  const avoid = new Set(recentPatterns)
  const picked: Exercise[] = []

  const pickFor = (track: QuestTrack, early: boolean) => {
    const lastTwo = new Set(picked.slice(-2).map((e) => e.pattern))
    const lastStat = picked[picked.length - 1]?.stat
    const pool = PRIMARY_EXERCISES.filter((e) =>
      track === 'CLASS'
        ? e.classAffinity.includes(classId)
        : !e.classAffinity.includes(classId)
    )
    return choose(rand, pool, [
      // most preferred first; each step relaxes a soft rule
      (e) =>
        !lastTwo.has(e.pattern) &&
        (!early || !avoid.has(e.pattern)) &&
        e.stat !== lastStat,
      (e) => !lastTwo.has(e.pattern) && e.stat !== lastStat,
      (e) => !lastTwo.has(e.pattern),
      () => true,
    ])
  }

  const quests: Quest[] = []
  times.forEach((opensAt, batch) => {
    const count =
      batch === 0
        ? FIRST_BATCH
        : BATCH_MIN + Math.floor(rand() * (BATCH_MAX - BATCH_MIN + 1))
    for (let i = 0; i < count; i++) {
      const slot = quests.length
      const track: QuestTrack = rand() < CLASS_SHARE ? 'CLASS' : 'WORLD'
      const e = pickFor(track, batch === 0)
      picked.push(e)
      quests.push({
        id: `${date}:${slot}`,
        date,
        slot,
        kind: 'scheduled',
        batch,
        track,
        opensAt,
        closesAt: times[batch + 1] ?? MINUTES_PER_DAY,
        exerciseId: e.id,
        reward: { stat: e.stat, amount: e.reward },
      })
    }
  })

  for (let i = 0; i < MAX_AD_QUESTS; i++) {
    const slot = quests.length
    const track: QuestTrack = i % 2 === 0 ? 'WORLD' : 'CLASS'
    const e = pickFor(track, false)
    picked.push(e)
    quests.push({
      id: `${date}:${slot}`,
      date,
      slot,
      kind: 'ad',
      batch: -1,
      track,
      opensAt: 0,
      closesAt: MINUTES_PER_DAY,
      exerciseId: e.id,
      reward: { stat: e.stat, amount: e.reward },
    })
  }
  return quests
}

function choose(
  rand: () => number,
  pool: Exercise[],
  prefs: ((e: Exercise) => boolean)[]
): Exercise {
  // Sort for a stable order independent of object key order.
  const sorted = [...pool].sort((a, b) => a.id.localeCompare(b.id))
  for (const ok of prefs) {
    const options = sorted.filter(ok)
    if (options.length) return options[Math.floor(rand() * options.length)]
  }
  throw new Error('No exercise available for this quest slot')
}

/** The exercise a quest is done with, after any swap. */
export function questExercise(
  quest: Quest,
  swaps: Record<string, string>
): Exercise {
  return getExercise(swaps[quest.id] ?? quest.exerciseId)
}
