// What the hero is standing at on the overworld: a camp site's campfire or a
// locked gate. Pure, so the screen only re-renders when the answer changes.
import type { CampSite, RegionGate } from '../../rpg/world'
import { TILE, type Point } from './mapTypes'

/** How close (tiles) the feet must be to a campfire to use it. */
export const CAMPFIRE_REACH = 1.8
/** How far below a gate (tiles) its panel shows. */
export const GATE_REACH = 2

export type Reach =
  { kind: 'site'; site: CampSite } | { kind: 'gate'; gate: RegionGate } | null

/** The campfire or gate within reach of feet `p` (map pixels), if any. */
export function reachAt(
  p: Point,
  sites: CampSite[],
  gates: RegionGate[]
): Reach {
  let best: CampSite | null = null
  let bestD = CAMPFIRE_REACH * TILE
  for (const s of sites) {
    // Measured from just south of the fire, where you stand to use it
    const d = Math.hypot(
      p.x - s.position.x * TILE,
      p.y - (s.position.y + 0.5) * TILE
    )
    if (d <= bestD) {
      best = s
      bestD = d
    }
  }
  if (best) return { kind: 'site', site: best }
  for (const g of gates) {
    const a = g.area
    const inX = p.x >= a.x * TILE && p.x <= (a.x + a.width) * TILE
    const below = p.y - (a.y + a.height) * TILE
    if (inX && below >= 0 && below <= GATE_REACH * TILE)
      return { kind: 'gate', gate: g }
  }
  return null
}

/** A stable key for a Reach, to compare without re-rendering. */
export const reachKey = (r: Reach) =>
  r === null
    ? ''
    : r.kind === 'site'
      ? `site:${r.site.id}`
      : `gate:${r.gate.regionId}`

/**
 * Screen points per art pixel: about TILES_SHORT tiles across the viewport's
 * short side, never below 1 or above 2.5.
 */
export const TILES_SHORT = 11
export const overworldScale = (width: number, height: number) =>
  Math.max(1, Math.min(2.5, Math.min(width, height) / (TILES_SHORT * TILE)))
