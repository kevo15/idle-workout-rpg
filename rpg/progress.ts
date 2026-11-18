// Hero progress: pure functions over the player's saved state. Nothing here
// touches storage; src/state/useHero.ts persists the result.
//
// Rules (docs/game-flow.md):
// - Only completed workout quests raise STR/END/AGI/VIT.
// - Quests arrive through the day, one every 2–4 hours (quests.ts), each open
//   until the next one arrives. Rewarded ads add up to MAX_AD_QUESTS more a
//   day. Each quest awards its full reward (2–4 points).
// - Completing a quest is idempotent: a second completion awards nothing (T03).
// - Swapping to an easier variant keeps the quest's reward, and the player
//   can swap back up to the harder one (T02, T32).
// - Warm-ups before expeditions never raise stats; they buff that one
//   expedition (rpg/expedition.ts).
// - Each class starts from its own base stat spread (classes.ts baseStats).
// - The class is fixed once chosen. Changing it means starting a new hero:
//   stats go back to the new class's base, and quest history and mastery
//   are cleared (`restartAs`). There is no free stat swap between classes.
// - Class level comes from points trained above the base, on a rising
//   curve: each level costs 4 more points than the last (`levelInfo`).

import { BASE_STAT_TOTAL, CLASSES } from './classes'
import type { ClassId, StatKey } from './types'
import { getExercise } from './exercises'
import { MAX_AD_QUESTS, planDay, type Quest } from './quests'

/**
 * Minutes a quest can still be completed after it closes, so a workout
 * started just before the next quest arrives still counts.
 */
export const QUEST_GRACE_MIN = 60

/** Days of quest history kept (planner and mastery use it). */
const HISTORY_DAYS = 30

export type Stats = Record<StatKey, number>

export interface Completion {
  questId: string
  exerciseId: string
  stat: StatKey
  awarded: number
  at: number
}

export interface DayLog {
  date: string
  /** Stat points earned today (shown on the board; not capped). */
  awarded: number
  byStat: Partial<Stats>
  done: Record<string, Completion>
  /** questId → exerciseId chosen with "Easier" (or back up with "Harder"). */
  swaps: Record<string, string>
  /** The day's scheduled quests plus the ad slots, planned once a day. */
  plan: Quest[] | null
  /** Ad quests unlocked today (max MAX_AD_QUESTS). */
  adQuests: number
  /** Map encounters trained today (max ENCOUNTER_TRAINING_PER_DAY). */
  encounterTraining?: number
  /** Map encounter fights won for gold today (max ENCOUNTER_GOLD_WINS_PER_DAY). */
  encounterWins?: number
  /** Map enemies to find (red dots) engaged today, by spot id. */
  spotsCleared?: string[]
}

export interface HeroState {
  version: 1
  profileId: string
  classId: ClassId | null
  stats: Stats
  today: DayLog
  /** Completions from previous days, newest last. */
  history: (Completion & { date: string })[]
  /** Story chapters already shown on the Map. */
  seenChapters: string[]
  /** Combat training finished (or skipped) for this hero's class. */
  tutorialDone?: boolean
}

export const emptyDay = (date: string): DayLog => ({
  date,
  awarded: 0,
  byStat: {},
  done: {},
  swaps: {},
  plan: null,
  adQuests: 0,
})

const NO_STATS: Stats = { STR: 0, END: 0, AGI: 0, VIT: 0 }

/** A save with no hero yet: stats arrive with the first class pick. */
export function newHero(profileId: string, date: string): HeroState {
  return {
    version: 1,
    profileId,
    classId: null,
    stats: { ...NO_STATS },
    today: emptyDay(date),
    history: [],
    seenChapters: [],
    tutorialDone: false,
  }
}

export const baseStats = (classId: ClassId): Stats => ({
  ...CLASSES[classId].baseStats,
})

/** Move to a new local date: archive yesterday's completions, reset quests. */
export function rollDay(state: HeroState, date: string): HeroState {
  if (state.today.date === date) return state
  const archived = Object.values(state.today.done).map((c) => ({
    ...c,
    date: state.today.date,
  }))
  const history = [...state.history, ...archived].filter(
    (h) => daysBetween(h.date, date) <= HISTORY_DAYS
  )
  return { ...state, today: emptyDay(date), history }
}

/** Plan today's quests if there's a class and no board yet. */
export function ensurePlan(state: HeroState): HeroState {
  if (state.today.plan || !state.classId) return state
  const plan = planDay({
    classId: state.classId,
    date: state.today.date,
    profileId: state.profileId,
    recentPatterns: patternsOn(state, previousDate(state.today.date)),
  })
  return { ...state, today: { ...state.today, plan } }
}

/**
 * Pick the first class: the hero starts with that class's base stats. Once a
 * class is set this does nothing; changing it goes through `restartAs`.
 */
export function chooseClass(state: HeroState, classId: ClassId): HeroState {
  if (state.classId) return state
  return { ...state, classId, stats: baseStats(classId) }
}

/**
 * Start over as a new hero of `classId`: base stats for that class, a fresh
 * day, no quest history or mastery, and the story from the start (chapters
 * show again as their areas open, like a new player). The only way to
 * change class.
 */
export function restartAs(state: HeroState, classId: ClassId): HeroState {
  return {
    ...newHero(state.profileId, state.today.date),
    classId,
    stats: baseStats(classId),
  }
}

// ---------------------------------------------------------------- quests

/** Minutes after local midnight for a timestamp. */
export function minutesOfDay(at: number) {
  const d = new Date(at)
  return d.getHours() * 60 + d.getMinutes()
}

const adIndex = (day: DayLog, q: Quest) =>
  (day.plan ?? []).filter((p) => p.kind === 'ad').indexOf(q)

/** True when the quest can be started right now (`now` = minutes of day). */
export function isQuestOpen(day: DayLog, q: Quest, now: number) {
  if (q.kind === 'ad') return adIndex(day, q) < day.adQuests
  return q.opensAt <= now && now < q.closesAt
}

/**
 * The quests to show now: everything done today, the open scheduled quest,
 * and any unlocked ad quests (in slot order).
 */
export function availableQuests(day: DayLog, now: number): Quest[] {
  return (day.plan ?? []).filter(
    (q) => day.done[q.id] || isQuestOpen(day, q, now)
  )
}

export type BoardStatus = 'done' | 'open' | 'expired' | 'upcoming' | 'locked'

export interface BoardEntry {
  quest: Quest
  /** The exercise it's done with (after any swap). */
  exerciseId: string
  status: BoardStatus
}

/**
 * Every quest planned for the day with where it stands at minute `now`:
 * done, open now, expired (its batch was replaced), upcoming (its batch
 * hasn't arrived), or locked (a bonus quest not unlocked yet). In plan
 * order: the batches through the day, then the bonus quests.
 */
export function questBoard(day: DayLog, now: number): BoardEntry[] {
  return (day.plan ?? []).map((quest) => {
    const status: BoardStatus = day.done[quest.id]
      ? 'done'
      : isQuestOpen(day, quest, now)
        ? 'open'
        : quest.kind === 'ad'
          ? 'locked'
          : quest.opensAt > now
            ? 'upcoming'
            : 'expired'
    return {
      quest,
      exerciseId: day.swaps[quest.id] ?? quest.exerciseId,
      status,
    }
  })
}

/** The next scheduled quest still to arrive today, if any. */
export function nextQuest(day: DayLog, now: number): Quest | undefined {
  return (day.plan ?? []).find((q) => q.kind === 'scheduled' && q.opensAt > now)
}

/** Scheduled quests that have arrived so far today. */
export const arrivedQuests = (day: DayLog, now: number) =>
  (day.plan ?? []).filter((q) => q.kind === 'scheduled' && q.opensAt <= now)

/** True when another ad quest can still be unlocked today. */
export const canAddAdQuest = (day: DayLog) => day.adQuests < MAX_AD_QUESTS

/** Unlock one ad quest today (rewarded-ad hook), never past MAX_AD_QUESTS. */
export function grantAdQuest(state: HeroState): HeroState {
  if (!canAddAdQuest(state.today)) return state
  return {
    ...state,
    today: { ...state.today, adQuests: state.today.adQuests + 1 },
  }
}

const currentExercise = (state: HeroState, quest: Quest) =>
  getExercise(state.today.swaps[quest.id] ?? quest.exerciseId)

/** Swap a quest to its current exercise's easier variant. */
export function swapEasier(state: HeroState, quest: Quest): HeroState {
  if (state.today.done[quest.id]) return state
  const current = currentExercise(state, quest)
  if (!current.easierId) return state
  return {
    ...state,
    today: {
      ...state.today,
      swaps: { ...state.today.swaps, [quest.id]: current.easierId },
    },
  }
}

/**
 * The exercise one step harder than the quest's current one, following the
 * quest's own swap chain back toward the planned exercise.
 */
export function harderStep(quest: Quest, currentId: string) {
  let step = getExercise(quest.exerciseId)
  while (step.easierId && step.easierId !== currentId) {
    step = getExercise(step.easierId)
  }
  return step.easierId === currentId ? step : undefined
}

/** Swap a quest back up to the harder variant (undoes one "Easier"). */
export function swapHarder(state: HeroState, quest: Quest): HeroState {
  if (state.today.done[quest.id]) return state
  const harder = harderStep(quest, currentExercise(state, quest).id)
  if (!harder) return state
  const swaps = { ...state.today.swaps }
  if (harder.id === quest.exerciseId) delete swaps[quest.id]
  else swaps[quest.id] = harder.id
  return { ...state, today: { ...state.today, swaps } }
}

export type CompleteResult = {
  state: HeroState
  awarded: number
  /** True when this quest was already complete (nothing changed). */
  duplicate: boolean
}

/**
 * Complete a quest at `at` (ms). `now` is the local minute of day, used to
 * check the quest is open (with QUEST_GRACE_MIN after it closes).
 */
export function completeQuest(
  state: HeroState,
  quest: Quest,
  at: number,
  now = minutesOfDay(at)
): CompleteResult {
  if (quest.date !== state.today.date)
    throw new Error(`Quest ${quest.id} is not for today (${state.today.date})`)
  if (state.today.done[quest.id]) return { state, awarded: 0, duplicate: true }
  const open =
    quest.kind === 'ad'
      ? isQuestOpen(state.today, quest, now)
      : quest.opensAt <= now && now < quest.closesAt + QUEST_GRACE_MIN
  if (!open) throw new Error(`Quest ${quest.id} is not open`)

  const { stat, amount: awarded } = quest.reward
  const completion: Completion = {
    questId: quest.id,
    exerciseId: state.today.swaps[quest.id] ?? quest.exerciseId,
    stat,
    awarded,
    at,
  }
  const today: DayLog = {
    ...state.today,
    awarded: state.today.awarded + awarded,
    byStat: {
      ...state.today.byStat,
      [stat]: (state.today.byStat[stat] ?? 0) + awarded,
    },
    done: { ...state.today.done, [quest.id]: completion },
  }
  return {
    state: {
      ...state,
      stats: { ...state.stats, [stat]: state.stats[stat] + awarded },
      today,
    },
    awarded,
    duplicate: false,
  }
}

/**
 * Map encounters skipped by training: +1 to the exercise's stat each, this
 * many times a day (so walking in circles can't farm stats).
 */
export const ENCOUNTER_TRAINING_PER_DAY = 3

/** Encounter trainings that still pay a stat point today. */
export const encounterTrainingLeft = (day: DayLog) =>
  Math.max(0, ENCOUNTER_TRAINING_PER_DAY - (day.encounterTraining ?? 0))

/**
 * A map encounter skipped with a quick set: +1 to `stat` (the encounter
 * exercise's), while today's allowance lasts. Returns the points awarded.
 */
export function trainEncounter(
  state: HeroState,
  stat: StatKey
): { state: HeroState; awarded: number } {
  if (encounterTrainingLeft(state.today) === 0) return { state, awarded: 0 }
  const today: DayLog = {
    ...state.today,
    awarded: state.today.awarded + 1,
    byStat: {
      ...state.today.byStat,
      [stat]: (state.today.byStat[stat] ?? 0) + 1,
    },
    encounterTraining: (state.today.encounterTraining ?? 0) + 1,
  }
  return {
    state: {
      ...state,
      stats: { ...state.stats, [stat]: state.stats[stat] + 1 },
      today,
    },
    awarded: 1,
  }
}

/**
 * Map encounter fights that pay gold, a day (more can be fought, for
 * practice), so walking in circles can't farm gold either.
 */
export const ENCOUNTER_GOLD_WINS_PER_DAY = 3

/** Encounter wins that still pay gold today. */
export const encounterWinsLeft = (day: DayLog) =>
  Math.max(0, ENCOUNTER_GOLD_WINS_PER_DAY - (day.encounterWins ?? 0))

/**
 * A map encounter fight won: counts against today's paid wins. `paid` says
 * whether this one earns its gold (the caller credits the camp).
 */
export function winEncounter(state: HeroState): {
  state: HeroState
  paid: boolean
} {
  if (encounterWinsLeft(state.today) === 0) return { state, paid: false }
  return {
    state: {
      ...state,
      today: {
        ...state.today,
        encounterWins: (state.today.encounterWins ?? 0) + 1,
      },
    },
    paid: true,
  }
}

/** A map enemy-to-find was engaged (fought or trained): gone for the day. */
export function clearSpot(state: HeroState, spotId: string): HeroState {
  const cleared = state.today.spotsCleared ?? []
  if (cleared.includes(spotId)) return state
  return {
    ...state,
    today: { ...state.today, spotsCleared: [...cleared, spotId] },
  }
}

/** Movement patterns trained on the given (previous) date. */
export function patternsOn(state: HeroState, date: string) {
  return state.history
    .filter((h) => h.date === date)
    .map((h) => getExercise(h.exerciseId).pattern)
}

// ---------------------------------------------------------------- story

/** Combat training is done (finished or skipped). */
export function markTutorialDone(state: HeroState): HeroState {
  return state.tutorialDone ? state : { ...state, tutorialDone: true }
}

export function markChapterSeen(state: HeroState, id: string): HeroState {
  if (state.seenChapters.includes(id)) return state
  return { ...state, seenChapters: [...state.seenChapters, id] }
}

// ---------------------------------------------------------------- derived

export function totalStats(stats: Stats) {
  return stats.STR + stats.END + stats.AGI + stats.VIT
}

/**
 * Points to go from `level` to `level + 1`: 12, 16, 20, … Early levels come
 * quickly; from about level 6 a full day of quests (6–8 at 2–4 points)
 * no longer covers a level, so expeditions carry more of the climb.
 */
export const levelCost = (level: number) => 12 + 4 * (level - 1)

/** Trained points needed to reach `level`: 2(L − 1)(L + 4). */
export const pointsForLevel = (level: number) => 2 * (level - 1) * (level + 4)

/**
 * Class level from points trained above the class base. It sets which
 * expedition levels the hero can take on.
 */
export function levelInfo(stats: Stats) {
  const trained = Math.max(0, totalStats(stats) - BASE_STAT_TOTAL)
  let level = 1
  while (pointsForLevel(level + 1) <= trained) level++
  const floor = pointsForLevel(level)
  const next = pointsForLevel(level + 1)
  return {
    level,
    trained,
    /** Points earned within this level, and the level's full cost. */
    into: trained - floor,
    cost: next - floor,
    toNext: next - trained,
  }
}

export const heroLevel = (stats: Stats) => levelInfo(stats).level

export function levelTitle(level: number) {
  if (level < 5) return 'ARENA RECRUIT'
  if (level < 10) return 'GYM REGULAR'
  if (level < 20) return 'FOREST WANDERER'
  return 'RAID CHAMPION'
}

/** Every quest completed, today included. */
export function questsCompleted(state: HeroState) {
  return state.history.length + Object.keys(state.today.done).length
}

// ---------------------------------------------------------------- dates

/** Local calendar date as YYYY-MM-DD. */
export function localDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function previousDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return localDate(new Date(y, m - 1, d - 1))
}

function daysBetween(a: string, b: string) {
  const t = (s: string) => {
    const [y, m, d] = s.split('-').map(Number)
    return Date.UTC(y, m - 1, d)
  }
  return Math.round((t(b) - t(a)) / 86400000)
}
