// The exercise catalog: equipment-free movements the quest planner picks
// from (roadmap §3.2). Pure data, shared by the app and (later) the backend.
//
// THE WORKOUTS LIVE IN rpg/data/workouts.json: edit that file to add or
// change a workout or a class's warm-up. This module loads it, checks it
// (loadWorkouts throws a clear error on a typo) and turns it into Exercise
// records for the game.
//
// An exercise's `stat` is the attribute its quest rewards. That's a game
// theme, not a claim that the movement trains only that system. Easier
// versions ("easierVersionOf" set) are never planned on their own: they're
// offered through "Easier" swaps and keep the quest's reward (roadmap T02,
// T32).

import data from './data/workouts.json'
import type { ClassId, StatKey } from './types'

export type ExerciseMode = 'reps' | 'timed'

/**
 * The kind of movement, so a day doesn't repeat it back to back: upper-body
 * pushes, squats, lunges, three kinds of core work (crunch: sit-up style;
 * twist: side to side; hold: planks, wall sits, dead bugs), cardio bursts
 * and mobility.
 */
export type MovementPattern =
  | 'push'
  | 'squat'
  | 'lunge'
  | 'crunch'
  | 'twist'
  | 'hold'
  | 'cardio'
  | 'mobility'

export interface Exercise {
  id: string
  name: string
  stat: StatKey
  mode: ExerciseMode
  sets: number
  /** Reps per set (mode 'reps') or seconds per set (mode 'timed'). */
  target: number
  pattern: MovementPattern
  impact: 'low' | 'medium' | 'high'
  /** Classes whose training theme this fits (roadmap §3.9). */
  classAffinity: ClassId[]
  /** Points a quest built on this exercise awards: 2 easy, 3 standard, 4 hard. */
  reward: number
  /** The easier swap, if there is one. */
  easierId?: string
  /** Set on easier swaps: the planned exercise this one stands in for. */
  variantOf?: string
  cues: string[]
}

/** One workout as written in rpg/data/workouts.json. */
export interface WorkoutEntry {
  id: string
  name: string
  /** Classes that get it as a CLASS quest; [] = a WORLD quest for everyone. */
  classes: string[]
  stat: string
  sets: number
  /** Reps per set, or `seconds` per set for a timed hold. Exactly one. */
  reps?: number
  seconds?: number
  reward: number
  pattern: string
  impact: string
  /** Id of the workout offered as this one's "Easier" swap. */
  easier?: string
  /**
   * Set on easier versions: the workout this stands in for. Never planned on
   * its own; only reached through "Easier".
   */
  easierVersionOf?: string
  cues: string[]
}

export interface WorkoutsFile {
  /** Each class's warm-up before an expedition: a workout id. */
  warmups: Record<string, string>
  /**
   * Removed workouts and what replaces them, so saved quests and history
   * that name an old id keep working (old id -> current workout id).
   */
  retired?: Record<string, string>
  workouts: WorkoutEntry[]
}

const CLASS_IDS: ClassId[] = ['warrior', 'archer', 'mage', 'summoner', 'rogue']
const STATS: StatKey[] = ['STR', 'END', 'AGI', 'VIT']
export const PATTERNS: MovementPattern[] = [
  'push',
  'squat',
  'lunge',
  'crunch',
  'twist',
  'hold',
  'cardio',
  'mobility',
]
const IMPACTS = ['low', 'medium', 'high'] as const

/**
 * Checks a workouts file and builds the catalog. Throws one error listing
 * every problem, naming the workout and field, so a bad edit fails loudly in
 * tests and at startup instead of producing odd quests.
 */
export function loadWorkouts(file: WorkoutsFile): {
  exercises: Record<string, Exercise>
  warmups: Record<string, string>
  retired: Record<string, string>
} {
  const problems: string[] = []
  const bad = (id: string, msg: string) => problems.push(`"${id}": ${msg}`)
  const ids = new Set<string>()

  for (const w of file.workouts) {
    const id = w.id || '(no id)'
    if (!w.id || !/^[a-z0-9-]+$/.test(w.id))
      bad(id, 'id must be lowercase letters, numbers and dashes')
    if (ids.has(w.id)) bad(id, 'id is used twice')
    ids.add(w.id)
    if (!w.name) bad(id, 'needs a name')
    for (const c of w.classes ?? [])
      if (!CLASS_IDS.includes(c as ClassId))
        bad(id, `unknown class "${c}" (use ${CLASS_IDS.join(', ')})`)
    if (!STATS.includes(w.stat as StatKey))
      bad(id, `stat must be one of ${STATS.join(', ')}`)
    if (!PATTERNS.includes(w.pattern as MovementPattern))
      bad(id, `pattern must be one of ${PATTERNS.join(', ')}`)
    if (!IMPACTS.includes(w.impact as (typeof IMPACTS)[number]))
      bad(id, `impact must be one of ${IMPACTS.join(', ')}`)
    if (!(w.sets >= 1)) bad(id, 'sets must be 1 or more')
    if ((w.reps === undefined) === (w.seconds === undefined))
      bad(id, 'give either "reps" or "seconds" (not both)')
    else if (!((w.reps ?? w.seconds ?? 0) >= 1))
      bad(id, 'reps/seconds must be 1 or more')
    if (!(w.reward >= 1 && w.reward <= 5)) bad(id, 'reward must be 1 to 5')
    if (!w.cues?.length) bad(id, 'needs at least one cue')
  }

  // Easier links must point at real workouts; an easier version awards the
  // same stat as the workout it stands in for (the quest keeps its reward)
  const byId = new Map(file.workouts.map((w) => [w.id, w]))
  for (const w of file.workouts) {
    if (w.easier && !byId.has(w.easier))
      bad(w.id, `easier swap "${w.easier}" isn't a workout`)
    if (w.easierVersionOf) {
      const of = byId.get(w.easierVersionOf)
      if (!of)
        bad(w.id, `easierVersionOf "${w.easierVersionOf}" isn't a workout`)
      else if (of.easierVersionOf)
        bad(
          w.id,
          `point easierVersionOf at the main workout, "${of.easierVersionOf}"`
        )
      else if (of.stat !== w.stat)
        bad(w.id, `must reward the same stat as "${w.easierVersionOf}"`)
    }
  }

  for (const [cls, id] of Object.entries(file.warmups)) {
    if (!CLASS_IDS.includes(cls as ClassId))
      bad(`warmups.${cls}`, 'unknown class')
    if (!byId.has(id)) bad(`warmups.${cls}`, `"${id}" isn't a workout`)
    else if (byId.get(id)!.easierVersionOf)
      bad(`warmups.${cls}`, `"${id}" is an easier version; use a main workout`)
  }

  for (const [old, now] of Object.entries(file.retired ?? {})) {
    if (byId.has(old))
      bad(`retired.${old}`, 'is still a workout; remove it here')
    if (!byId.has(now)) bad(`retired.${old}`, `"${now}" isn't a workout`)
  }

  if (problems.length)
    throw new Error(
      `rpg/data/workouts.json has problems:\n  ${problems.join('\n  ')}`
    )

  const exercises: Record<string, Exercise> = {}
  for (const w of file.workouts) {
    exercises[w.id] = {
      id: w.id,
      name: w.name,
      stat: w.stat as StatKey,
      mode: w.reps !== undefined ? 'reps' : 'timed',
      sets: w.sets,
      target: (w.reps ?? w.seconds)!,
      pattern: w.pattern as MovementPattern,
      impact: w.impact as Exercise['impact'],
      classAffinity: w.classes as ClassId[],
      reward: w.reward,
      ...(w.easier ? { easierId: w.easier } : {}),
      ...(w.easierVersionOf ? { variantOf: w.easierVersionOf } : {}),
      cues: w.cues,
    }
  }
  return { exercises, warmups: file.warmups, retired: file.retired ?? {} }
}

const loaded = loadWorkouts(data as WorkoutsFile)

export const EXERCISES: Record<string, Exercise> = loaded.exercises

/** Each class's warm-up before an expedition (workouts.json "warmups"). */
export const WARMUPS: Record<string, string> = loaded.warmups

/** Removed workout ids and their replacements (workouts.json "retired"). */
export const RETIRED: Record<string, string> = loaded.retired

/** A workout by id; a retired id gives its replacement. */
export function getExercise(id: string): Exercise {
  const e = EXERCISES[id] ?? EXERCISES[RETIRED[id]]
  if (!e) throw new Error(`Unknown exercise: ${id}`)
  return e
}

/** Exercises the planner may schedule (easier swaps are swap-only). */
export const PRIMARY_EXERCISES: Exercise[] = Object.values(EXERCISES).filter(
  (e) => !e.variantOf
)
