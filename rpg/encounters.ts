// Wild encounters on the overworld, like tall grass in Pokémon: while the
// hero walks on grass, each tile crossed may bring an enemy out. Then the
// player chooses:
//   FIGHT: a hand-played fight; winning pays encounterGold (one battle's
//          worth), ENCOUNTER_GOLD_WINS_PER_DAY times a day; after that the
//          fights are for practice (losing never costs anything);
//   TRAIN: skip the fight with one quick set of a class exercise, for +1 to
//          that exercise's stat (ENCOUNTER_TRAINING_PER_DAY a day, so
//          walking in circles can't farm stats: rpg/progress.ts);
//   RUN:   carry on walking.
// No encounters on dirt roads, near campfires, or for a few tiles after the
// last one. Enemies and levels come from the nearest camp site, so the
// deeper parts of a region are tougher.
import type { ClassId } from './classes'
import { PRIMARY_EXERCISES } from './exercises'
import { CLASS_SHARE } from './quests'
import { goldPerWin } from './expedition'
import type { CampSite, TilePoint } from './world'

/** Chance per grass tile walked once the cooldown is over. */
export const ENCOUNTER_CHANCE = 0.06
/** Tiles walked after an encounter before the next can happen. */
export const ENCOUNTER_COOLDOWN_TILES = 10
/** No encounters this close (tiles) to a campfire. */
export const SAFE_RADIUS = 6

export interface Encounter {
  enemy: string
  level: number
  /** The camp site whose area it came from. */
  siteId: string
  /** TRAIN: the exercise to do instead of fighting. */
  exerciseId: string
  /** An enemy to find (a red dot), rather than one from the grass. */
  spotId?: string
}

/**
 * Should crossing this tile bring an enemy out? `tilesSince`: grass tiles
 * walked since the last encounter.
 */
export function rollEncounter(
  rand: () => number,
  tile: { grass: boolean; safe: boolean },
  tilesSince: number
): boolean {
  if (!tile.grass || tile.safe) return false
  if (tilesSince < ENCOUNTER_COOLDOWN_TILES) return false
  return rand() < ENCOUNTER_CHANCE
}

/** True near any campfire (no encounters there). */
export const nearCamp = (p: TilePoint, sites: CampSite[]) =>
  sites.some(
    (s) =>
      (s.position.x - p.x) ** 2 + (s.position.y - p.y) ** 2 < SAFE_RADIUS ** 2
  )

/** The camp site closest to tile `p` (its area's enemies come out). */
export function nearestSite(p: TilePoint, sites: CampSite[]): CampSite {
  let best = sites[0]
  let bestD = Infinity
  for (const s of sites) {
    const d = (s.position.x - p.x) ** 2 + (s.position.y - p.y) ** 2
    if (d < bestD) {
      best = s
      bestD = d
    }
  }
  return best
}

/**
 * Who comes out at tile `p`: one of the nearest site's enemies (never its
 * boss) at a level in the lower half of its band, and an exercise from the
 * hero's class list to TRAIN with instead.
 */
export function pickEncounter(
  p: TilePoint,
  sites: CampSite[],
  classId: ClassId,
  rand: () => number,
  /** The exercise offered last time: never offered twice in a row. */
  avoid?: string | null
): Encounter {
  const site = nearestSite(p, sites)
  const [lo, hi] = site.levelBand
  const top = Math.max(lo, Math.floor((lo + hi) / 2))
  // The same split as the quest board (rpg/quests.ts): CLASS_SHARE of the
  // time one of the class's workouts, otherwise a WORLD one (any other),
  // equal odds within each, never the exercise offered last time
  const classTrack = rand() < CLASS_SHARE
  const pool = PRIMARY_EXERCISES.filter(
    (e) => e.classAffinity.includes(classId) === classTrack
  )
  const all = pool.length ? pool : PRIMARY_EXERCISES
  const fresh = all.filter((e) => e.id !== avoid)
  const exercises = fresh.length ? fresh : all
  return {
    enemy: site.enemies[Math.floor(rand() * site.enemies.length)],
    level: lo + Math.floor(rand() * (top - lo + 1)),
    siteId: site.id,
    exerciseId: exercises[Math.floor(rand() * exercises.length)].id,
  }
}

/**
 * Gold for winning an encounter fight: one battle's worth. With the daily
 * cap (rpg/progress.ts) that's at most about a quarter of a night's
 * expedition gold, so region prices (rpg/economy.ts) still hold.
 */
export const encounterGold = (level: number) => goldPerWin(level)
