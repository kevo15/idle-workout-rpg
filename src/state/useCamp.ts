// Camp: gold, where camp is set, the running expedition and the log of past
// ones (docs/game-flow.md §6). Saved on the device. The rules live in
// rpg/expedition.ts; results are placeholders until the combat sim exists.

import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import {
  newExpedition,
  phaseAt,
  placeholderResult,
  playThroughBonus,
  type Approach,
  type CheckpointOption,
  type Expedition,
  type ExpeditionResult,
} from '../../rpg/expedition'
import { getCampSite, STARTING_CAMP } from '../../rpg/world'

export interface LoggedExpedition {
  expedition: Expedition
  result: ExpeditionResult
  claimedAt: number
  /** PLAY THROUGH bonus already collected (once per expedition). */
  playedThrough: boolean
}

/** Past expeditions kept for REPLAY. */
const LOG_SIZE = 20

interface CampData {
  gold: number
  siteId: string
  current: Expedition | null
  /** A warm-up was done for the next expedition (consumed on start). */
  warmupReady: boolean
  log: LoggedExpedition[]
}

type CampStore = CampData & {
  /** Start the next expedition (only when none is running). */
  start: (approach: Approach, heroLevel: number) => Expedition | null
  /** Answer the running expedition's checkpoint. */
  answer: (call: CheckpointOption['id']) => void
  /** Bank a finished expedition's gold, once, and log it for REPLAY. */
  claim: () => LoggedExpedition | null
  markWarmup: () => void
  /** Collect the once-only PLAY THROUGH bonus. Returns the gold paid. */
  finishPlayThrough: (expeditionId: string) => number
  /** Dev helpers: jump the running expedition forward. */
  devToCheckpoint: () => void
  devToMorning: () => void
  reset: () => void
}

const EMPTY: CampData = {
  gold: 0,
  siteId: STARTING_CAMP.id,
  current: null,
  warmupReady: false,
  log: [],
}

const newId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

export const useCamp = create<CampStore>()(
  persist(
    (set, get) => ({
      ...EMPTY,
      start: (approach, heroLevel) => {
        if (get().current) return null
        const expedition = newExpedition({
          id: newId(),
          site: getCampSite(get().siteId),
          approach,
          heroLevel,
          warmup: get().warmupReady,
          now: Date.now(),
        })
        set({ current: expedition, warmupReady: false })
        return expedition
      },
      answer: (call) => {
        const cur = get().current
        if (!cur || cur.call) return
        set({ current: { ...cur, call } })
      },
      claim: () => {
        const cur = get().current
        if (!cur || phaseAt(cur, Date.now()) !== 'DONE') return null
        const entry: LoggedExpedition = {
          expedition: cur,
          result: placeholderResult(cur),
          claimedAt: Date.now(),
          playedThrough: false,
        }
        set((s) => ({
          gold: s.gold + entry.result.gold,
          current: null,
          log: [entry, ...s.log].slice(0, LOG_SIZE),
        }))
        return entry
      },
      markWarmup: () => set({ warmupReady: true }),
      finishPlayThrough: (expeditionId) => {
        const entry = get().log.find((l) => l.expedition.id === expeditionId)
        if (!entry || entry.playedThrough) return 0
        const bonus = playThroughBonus(entry.result)
        set((s) => ({
          gold: s.gold + bonus,
          log: s.log.map((l) =>
            l.expedition.id === expeditionId ? { ...l, playedThrough: true } : l
          ),
        }))
        return bonus
      },
      devToCheckpoint: () => {
        const cur = get().current
        if (!cur) return
        set({
          current: { ...cur, startedAt: Date.now() - cur.durationMs / 4 },
        })
      },
      devToMorning: () => {
        const cur = get().current
        if (!cur) return
        set({ current: { ...cur, startedAt: Date.now() - cur.durationMs } })
      },
      reset: () => set({ ...EMPTY }),
    }),
    {
      name: 'rep-raiders/camp',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ gold, siteId, current, warmupReady, log }) => ({
        gold,
        siteId,
        current,
        warmupReady,
        log,
      }),
    }
  )
)

/** The results the current expedition will bank (placeholder until the sim). */
export const previewResult = (e: Expedition) => placeholderResult(e)
