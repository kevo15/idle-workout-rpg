// Enemies to find: a few enemies standing at set spots on each map, picked
// fresh every day (seeded by map and date), shown as red dots on the mini-map
// so exploring has something to find. Walking up to one starts its
// encounter (rpg/encounters.ts); engaging it (FIGHT or TRAIN) clears it for
// the day. They're tougher than grass encounters: the top half of the
// nearest camp site's level band.
import { nearestSite, SAFE_RADIUS } from '../../rpg/encounters'
import { seeded } from '../../rpg/rng'
import type { CampSite, RegionGate } from '../../rpg/world'
import { isBlocked } from './collision'
import { TILE, type MapDef } from './mapTypes'
import { solidRects } from './terrain'

export const SPOTS_PER_MAP = 6
/** Spots are at least this far apart (tiles). */
export const SPOT_SPACING = 14
/** Walking this close (tiles) to a spot starts its encounter. */
export const SPOT_REACH = 1.4

export interface EnemySpot {
  /** `${mapId}:${date}:${n}`: unique for the day. */
  id: string
  /** Where it stands (feet), in tiles. */
  x: number
  y: number
  enemy: string
  level: number
  siteId: string
}

/** The day's enemies on `map`. */
export function daySpots(
  map: MapDef,
  sites: CampSite[],
  gates: RegionGate[],
  date: string,
  count = SPOTS_PER_MAP
): EnemySpot[] {
  const rand = seeded(`spots:${map.id}:${date}`)
  const solids = solidRects(map)
  const rows = map.terrain.length
  const cols = map.terrain[0].length
  const far = (x: number, y: number, p: { x: number; y: number }, r: number) =>
    (x - p.x) ** 2 + (y - p.y) ** 2 >= r * r

  // Open grass, away from camps, the gate and the map's way in
  const ok = (x: number, y: number) =>
    map.terrain[y]?.[x] === '.' &&
    sites.every((s) => far(x, y, s.position, SAFE_RADIUS + 3)) &&
    gates.every((g) => far(x, y, { x: g.area.x + 3, y: g.area.y }, 10)) &&
    far(x, y, map.spawn, 8) &&
    !isBlocked({ x: x * TILE + TILE / 2, y: y * TILE + TILE - 4 }, solids)

  const spots: EnemySpot[] = []
  for (let tries = 0; tries < 4000 && spots.length < count; tries++) {
    const x = 4 + Math.floor(rand() * (cols - 8))
    const y = 4 + Math.floor(rand() * (rows - 8))
    if (!ok(x, y)) continue
    if (!spots.every((s) => far(x, y, s, SPOT_SPACING))) continue
    const site = nearestSite({ x, y }, sites)
    const [lo, hi] = site.levelBand
    const bottom = Math.min(hi, Math.ceil((lo + hi) / 2))
    spots.push({
      id: `${map.id}:${date}:${spots.length}`,
      x,
      y,
      enemy: site.enemies[Math.floor(rand() * site.enemies.length)],
      level: bottom + Math.floor(rand() * (hi - bottom + 1)),
      siteId: site.id,
    })
  }
  return spots
}

/** The spot within reach of feet (map pixels), if any. */
export function spotAt(
  feet: { x: number; y: number },
  spots: EnemySpot[]
): EnemySpot | undefined {
  return spots.find(
    (s) =>
      Math.hypot(feet.x - (s.x + 0.5) * TILE, feet.y - (s.y + 1) * TILE) <=
      SPOT_REACH * TILE
  )
}
