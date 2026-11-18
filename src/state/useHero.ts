// The player's hero, saved on the device (local-first; a server takes over
// as the source of truth later). All rules live in rpg/progress.ts; this
// store only persists their results and keeps "today" current.

import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useMemo } from 'react'
import { AppState } from 'react-native'
import { create } from 'zustand'
import type { StatKey } from '../../rpg/types'
import { createJSONStorage, persist } from 'zustand/middleware'

import { CLASSES, type ClassId } from '../../rpg/classes'
import { getExercise, type Exercise } from '../../rpg/exercises'
import {
  chooseClass,
  completeQuest,
  availableQuests,
  emptyDay,
  ensurePlan,
  grantAdQuest,
  harderStep,
  minutesOfDay,
  localDate,
  markChapterSeen,
  markTutorialDone,
  newHero,
  restartAs,
  rollDay,
  swapEasier,
  swapHarder,
  type CompleteResult,
  type Completion,
  type HeroState,
  trainEncounter as trainEncounterRule,
  winEncounter as winEncounterRule,
  clearSpot as clearSpotRule,
} from '../../rpg/progress'
import type { Quest } from '../../rpg/quests'
import { useNow } from '../hooks/useNow'
import { STAT_ORDER } from '../theme/tokens'

type HeroStore = HeroState & {
  hydrated: boolean
  /** Roll over to today's date and make sure today's board exists. */
  syncDay: () => void
  /** First class pick only; ignored once the hero has a class. */
  pickClass: (classId: ClassId) => void
  /** Start over as a new hero of this class (base stats, no history). */
  restart: (classId: ClassId) => void
  complete: (questId: string) => CompleteResult | null
  /** Swap a quest to its easier variant. */
  swap: (questId: string) => void
  /** Swap a quest back up to the harder variant. */
  harder: (questId: string) => void
  /** Unlock an ad quest (rewarded-ad hook), up to MAX_AD_QUESTS a day. */
  addAdQuest: () => void
  /** Record that a Map story card was shown. */
  seeChapter: (chapterId: string) => void
  /** A map encounter skipped with a quick set: +1 to `stat` (daily cap). */
  trainEncounter: (stat: StatKey) => number
  /** A map encounter fight won: true if it pays gold (daily cap). */
  winEncounter: () => boolean
  /** A map enemy-to-find was engaged: gone for the rest of the day. */
  clearSpot: (spotId: string) => void
  /** Combat training finished or skipped (runs again after a class change). */
  finishTutorial: () => void
  /** Dev helper: wipe the save and start over. */
  reset: () => void
}

const newProfileId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 10)

const today = () => localDate(new Date())

/**
 * Save versions:
 * 1 → 2: every hero started at 5 in each stat; heroes now start at their
 *        class's base spread. Keep the points already trained on top of it.
 * 2 → 3: quests capped by count (plan grows to the max slots, bonus quests)
 *        and Map story chapters. Re-plan today; nothing seen yet.
 * 3 → 4: warm-up bonus stats (daily allowance counter).
 * 4 → 5: quests arrive every 2–4 hours, 2 ad quests a day; warm-ups no
 *        longer give stats. Today's earlier completions move to history
 *        (stats kept) and today is re-planned on the new schedule.
 * 5 → 6: quests arrive in batches (3, then 2–3 every 2–4 hours). Same move:
 *        archive today's completions and re-plan.
 */
export function migrateHero(h: HeroState, from: number): HeroState {
  let out = h
  if (from < 2) {
    const base = out.classId ? CLASSES[out.classId].baseStats : null
    const stats = { ...out.stats }
    for (const k of STAT_ORDER)
      stats[k] = base ? base[k] + Math.max(0, out.stats[k] - 5) : 0
    out = { ...out, stats }
  }
  if (from < 3) {
    out = {
      ...out,
      seenChapters: out.seenChapters ?? [],
      // the old 3-slot plan is replaced so bonus slots exist; slots 0–2 keep
      // their ids, so today's completions still line up
      today: { ...out.today, plan: null },
    }
  }
  if (from < 6) {
    const archived = Object.values(out.today.done ?? {}).map((c) => ({
      ...c,
      date: out.today.date,
    }))
    out = {
      ...out,
      history: [...out.history, ...archived],
      today: { ...emptyDay(out.today.date), swaps: {} },
    }
  }
  return out
}

/** Picks the saved HeroState fields out of the store. */
function heroOf(s: HeroStore): HeroState {
  const { version, profileId, classId, stats, history, seenChapters } = s
  return {
    version,
    profileId,
    classId,
    stats,
    today: s.today,
    history,
    seenChapters,
    tutorialDone: s.tutorialDone,
  }
}

export const useHero = create<HeroStore>()(
  persist(
    (set, get) => {
      const apply = (fn: (h: HeroState) => HeroState) =>
        set(fn(ensurePlan(rollDay(heroOf(get()), today()))))
      return {
        ...newHero(newProfileId(), today()),
        hydrated: false,
        syncDay: () => apply((h) => h),
        pickClass: (classId) =>
          apply((h) => ensurePlan(chooseClass(h, classId))),
        restart: (classId) => apply((h) => ensurePlan(restartAs(h, classId))),
        complete: (questId) => {
          const h = ensurePlan(rollDay(heroOf(get()), today()))
          const quest = h.today.plan?.find((q) => q.id === questId)
          if (!quest) return null
          try {
            // closed quests (past the grace period) throw: nothing awarded
            const result = completeQuest(h, quest, Date.now())
            set(result.state)
            return result
          } catch {
            return null
          }
        },
        swap: (questId) =>
          apply((h) => {
            const quest = h.today.plan?.find((q) => q.id === questId)
            return quest ? swapEasier(h, quest) : h
          }),
        harder: (questId) =>
          apply((h) => {
            const quest = h.today.plan?.find((q) => q.id === questId)
            return quest ? swapHarder(h, quest) : h
          }),
        addAdQuest: () => apply(grantAdQuest),
        seeChapter: (id) => apply((h) => markChapterSeen(h, id)),
        finishTutorial: () => apply(markTutorialDone),
        trainEncounter: (stat) => {
          const r = trainEncounterRule(
            ensurePlan(rollDay(heroOf(get()), today())),
            stat
          )
          set(r.state)
          return r.awarded
        },
        clearSpot: (spotId) => apply((h) => clearSpotRule(h, spotId)),
        winEncounter: () => {
          const r = winEncounterRule(
            ensurePlan(rollDay(heroOf(get()), today()))
          )
          set(r.state)
          return r.paid
        },
        reset: () => set({ ...newHero(newProfileId(), today()) }),
      }
    },
    {
      name: 'rep-raiders/hero',
      version: 6,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => heroOf(s),
      migrate: (persisted, from) => migrateHero(persisted as HeroState, from),
      onRehydrateStorage: () => (state) => {
        state?.syncDay()
        useHero.setState({ hydrated: true })
      },
    }
  )
)

/** Keep "today" correct across midnight and app resumes. */
export function useDayRollover() {
  const syncDay = useHero((s) => s.syncDay)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') syncDay()
    })
    const timer = setInterval(syncDay, 60_000)
    return () => {
      sub.remove()
      clearInterval(timer)
    }
  }, [syncDay])
}

export type QuestView = {
  quest: Quest
  exercise: Exercise
  done: Completion | undefined
  /** An easier variant to swap to. */
  canSwap: boolean
  /** The harder variant to swap back to, after an "Easier". */
  harder: Exercise | undefined
}

/** The local minute of day, refreshed every 30 seconds. */
export function useMinuteOfDay() {
  return minutesOfDay(useNow(30_000))
}

/**
 * The quests to show now: today's done quests, the open scheduled quest and
 * any unlocked ad quests, with their current (possibly swapped) exercise.
 */
export function useTodayQuests(): QuestView[] {
  const day = useHero((s) => s.today)
  const now = useMinuteOfDay()
  return useMemo(
    () =>
      availableQuests(day, now).map((quest) => {
        const exercise = getExercise(day.swaps[quest.id] ?? quest.exerciseId)
        const done = day.done[quest.id]
        return {
          quest,
          exercise,
          done,
          canSwap: !done && !!exercise.easierId,
          harder: done ? undefined : harderStep(quest, exercise.id),
        }
      }),
    [day, now]
  )
}
