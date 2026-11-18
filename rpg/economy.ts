// Region prices, worked out from how much gold a player earns on the way to
// the region's level, so they keep up if expedition pay or leveling change.
//
// The model (an estimate for pacing, not a promise):
//   - one expedition a night (Balanced: enemies at the hero's level);
//   - a typical night: NIGHT_BATTLES battles, NIGHT_WIN_RATE of them won,
//     goldPerWin(level) each (rpg/expedition.ts);
//   - a moderate quest pace: POINTS_PER_DAY trained points a day, so level L
//     takes levelCost(L) / POINTS_PER_DAY nights (rpg/progress.ts).
// A region costs PRICE_MULTIPLIER times the gold earned getting from level 1
// to its level, rounded to 50.

import { goldPerWin } from './expedition'
import { levelCost } from './progress'

export const NIGHT_BATTLES = 14
export const NIGHT_WIN_RATE = 0.8
export const POINTS_PER_DAY = 15
export const PRICE_MULTIPLIER = 1.5

/** A typical night's gold with the hero at `level`. */
export const nightGold = (level: number) =>
  Math.round(NIGHT_BATTLES * NIGHT_WIN_RATE * goldPerWin(level))

/** Nights spent at `level` before reaching the next one. */
export const nightsAtLevel = (level: number) =>
  levelCost(level) / POINTS_PER_DAY

/** Gold earned from expeditions on the way from level 1 to `level`. */
export function goldToReach(level: number) {
  let gold = 0
  for (let l = 1; l < level; l++) gold += nightGold(l) * nightsAtLevel(l)
  return gold
}

/** What a region opening at `level` costs. */
export const regionPrice = (level: number) =>
  Math.round((PRICE_MULTIPLIER * goldToReach(level)) / 50) * 50
