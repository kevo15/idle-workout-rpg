// Camp: gold, where camp is set, the running expedition and the log of past
// ones (docs/game-flow.md §6). Saved on the device. The rules live in
// rpg/expedition.ts; results are placeholders until the combat sim exists.

import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import {
  newExpedition,
  phaseAt,
  expeditionResult,
  playThroughBonus,
  type Approach,
  type ExpeditionCall,
  type Expedition,
  type ExpeditionResult,
} from '../../rpg/expedition'
import type { ClassId, StatKey } from '../../rpg/types'
import {
  getCampSite,
  getRegion,
  REGIONS,
  STARTING_CAMP,
  STARTING_REGION,
} from '../../rpg/world'

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
  /** Regions bought with gold (free ones are always open). */
  unlocked: string[]
  /** The area picked on the Map: its overworld opens. */
  areaId: string
}

type CampStore = CampData & {
  /**
   * Move camp to another site (Map: SET CAMP HERE). Refused while an
   * expedition is running or unclaimed. Returns whether camp moved.
   */
  setSite: (siteId: string) => boolean
  /**
   * Buy a region with gold, once. Refused when it's already open, the
   * region before it isn't, or there isn't enough gold. Returns whether it
   * was bought.
   */
  buyRegion: (regionId: string) => boolean
  /** Pick the area to explore (only an open one). Returns whether it changed. */
  selectArea: (regionId: string) => boolean
  /**
   * Starting over with a new class: a full reset, like a new player. The
   * expedition out now is called off, gold and the replay log are wiped,
   * bought areas lock again and camp goes back to the starting camp.
   */
  startOver: () => void
  /** Bank gold from elsewhere (a won map encounter). */
  earn: (gold: number) => void
  /** Start the next expedition (only when none is running). */
  /** Sets out (with the hero's stats and class, to fight the night with). */
  start: (
    approach: Approach,
    heroLevel: number,
    hero?: { stats: Record<StatKey, number>; classId: ClassId }
  ) => Expedition | null
  /** Answer the running expedition's checkpoint. */
  answer: (call: ExpeditionCall) => void
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
  unlocked: [],
  areaId: STARTING_REGION.id,
}

/** A region is open when it's free or has been bought. */
export const isOpen = (unlocked: string[], regionId: string) =>
  getRegion(regionId).price === 0 || unlocked.includes(regionId)

/** Regions are bought in order: the one before must be open first. */
export const canBuyNext = (unlocked: string[], regionId: string) => {
  const i = REGIONS.findIndex((r) => r.id === regionId)
  return i <= 0 || isOpen(unlocked, REGIONS[i - 1].id)
}

const newId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

export const useCamp = create<CampStore>()(
  persist(
    (set, get) => ({
      ...EMPTY,
      setSite: (siteId) => {
        if (get().current) return false
        getCampSite(siteId) // throws on an unknown site
        set({ siteId })
        return true
      },
      buyRegion: (regionId) => {
        const region = getRegion(regionId)
        const { gold, unlocked } = get()
        if (
          isOpen(unlocked, regionId) ||
          !canBuyNext(unlocked, regionId) ||
          gold < region.price
        )
          return false
        set({ gold: gold - region.price, unlocked: [...unlocked, regionId] })
        return true
      },
      startOver: () => set({ ...EMPTY }),
      earn: (gold) => set((s) => ({ gold: s.gold + Math.max(0, gold) })),
      selectArea: (regionId) => {
        if (!isOpen(get().unlocked, regionId)) return false
        set({ areaId: regionId })
        return true
      },
      start: (approach, heroLevel, hero) => {
        if (get().current) return null
        const expedition = newExpedition({
          id: newId(),
          site: getCampSite(get().siteId),
          approach,
          heroLevel,
          warmup: get().warmupReady,
          now: Date.now(),
          heroStats: hero?.stats,
          classId: hero?.classId,
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
          result: previewResult(cur),
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
      partialize: ({
        gold,
        siteId,
        current,
        warmupReady,
        log,
        unlocked,
        areaId,
      }) => ({
        gold,
        siteId,
        current,
        warmupReady,
        log,
        unlocked,
        areaId,
      }),
    }
  )
)

/** The results the current expedition will bank (placeholder until the sim). */
/**
 * The night's result (fought once, then remembered: Camp shows it before
 * it's claimed, and claiming logs the same one).
 */
const results = new Map<string, ExpeditionResult>()
export function previewResult(e: Expedition): ExpeditionResult {
  const key = `${e.id}:${e.call ?? ''}`
  let r = results.get(key)
  if (!r) {
    r = expeditionResult(e, getCampSite(e.siteId))
    results.set(key, r)
  }
  return r
}
