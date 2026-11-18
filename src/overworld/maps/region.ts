import { CAMP_SITES, REGION_GATES } from '../../../rpg/world'
import {
  type MapDef,
  type MapTheme,
  type PlacedObject,
  type Point,
  type Rect,
} from '../mapTypes'
import { paint, type PaintRect } from '../terrain'

// Builds a region's overworld from a few shapes instead of hand-typed rows:
// rivers, ponds, roads, open glades and plazas, a clearing around each
// campfire, then trees everywhere else on a jittered lattice (thick at the
// map edge). Camp sites and gates come from rpg/world.ts by map id.
// Deterministic: the same spec always gives the same map.

/** Every region map is 120 x 108 tiles: 3x each side of Shadow Sprinter's village. */
export const MAP_W = 120
export const MAP_H = 108

export type RegionSpec = {
  id: string
  name: string
  theme: MapTheme
  /** Rivers: 3-wide bands along axis-aligned waypoints. */
  rivers?: [number, number][][]
  /** Ponds (water) and plazas (dirt): rects in tiles. */
  ponds?: Rect[]
  plazas?: Rect[]
  /** 2-wide roads, [x0, y0, x1, y1], horizontal or vertical. Painted over water: fords. */
  roads: [number, number, number, number][]
  /** Few trees inside these circles. */
  glades?: { x: number; y: number; r: number }[]
  /** Tree chance away from the edge and glades, 0-1. */
  density: number
  /** Share of pines north of y = 40 and south of it. */
  pines: { north: number; south: number }
  barrels?: Point[]
  /** Where the hero arrives when camp isn't on this map, in tiles. */
  entry: Point
}

/** A 3-wide water band along a path of axis-aligned waypoints. */
function river(points: [number, number][]): PaintRect[] {
  const out: PaintRect[] = []
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1]
    const [x1, y1] = points[i]
    out.push({
      c: 'w',
      x: Math.min(x0, x1),
      y: Math.min(y0, y1),
      w: Math.abs(x1 - x0) + 3,
      h: Math.abs(y1 - y0) + 3,
    })
  }
  return out
}

const road = ([x0, y0, x1, y1]: [
  number,
  number,
  number,
  number,
]): PaintRect => ({
  c: 'd',
  x: Math.min(x0, x1),
  y: Math.min(y0, y1),
  w: Math.abs(x1 - x0) + 2,
  h: Math.abs(y1 - y0) + 2,
})

/** Deterministic 0..1 per tile and salt. */
function hash01(x: number, y: number, salt: number) {
  let h = (x * 374761393 + y * 668265263 + salt * 2147483647) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

const near = (x: number, y: number, p: Point, r: number) =>
  (x - p.x) ** 2 + (y - p.y) ** 2 < r * r

/** Object kinds for a theme's oaks and pines (src/overworld/objects.ts). */
const TREE_KINDS: Record<MapTheme, { oak: string; pine: string }> = {
  forest: { oak: 'tree', pine: 'pine' },
  kingdom: { oak: 'tree_autumn', pine: 'pine_autumn' },
  ash: { oak: 'tree_ash', pine: 'pine_ash' },
}

/** A campfire's blocked base, in tiles (it's drawn by the screen). */
export const campfireSolid = (p: Point): Rect => ({
  x: p.x - 0.5,
  y: p.y - 0.5,
  width: 1,
  height: 0.5,
})

export function buildRegionMap(spec: RegionSpec): MapDef {
  const sites = CAMP_SITES.filter((s) => s.mapId === spec.id)
  const gates = REGION_GATES.filter((g) => g.mapId === spec.id)

  const terrain = paint(MAP_W, MAP_H, [
    ...(spec.rivers ?? []).flatMap(river),
    ...(spec.ponds ?? []).map((p): PaintRect => ({
      c: 'w',
      x: p.x,
      y: p.y,
      w: p.width,
      h: p.height,
    })),
    ...(spec.plazas ?? []).map((p): PaintRect => ({
      c: 'd',
      x: p.x,
      y: p.y,
      w: p.width,
      h: p.height,
    })),
    ...spec.roads.map(road),
    // A trampled patch around each campfire
    ...sites.map((s): PaintRect => ({
      c: 'd',
      x: s.position.x - 3,
      y: s.position.y - 2,
      w: 7,
      h: 5,
    })),
  ])

  const at = (x: number, y: number) => terrain[y]?.[x] ?? 'x'
  const allGrass = (x: number, y: number, w: number, h: number) => {
    for (let r = y; r < y + h; r++)
      for (let c = x; c < x + w; c++) if (at(c, r) !== '.') return false
    return true
  }

  /** How likely a tree is at tile (x, y): 0 in clearings, 1 at the map edge. */
  const density = (x: number, y: number) => {
    const edge = Math.min(x, y, MAP_W - 1 - x, MAP_H - 1 - y)
    if (sites.some((s) => near(x, y, s.position, 7))) return 0
    if (gates.some((g) => near(x, y, { x: g.area.x + 3, y: g.area.y }, 6)))
      return 0
    if (near(x, y, spec.entry, 4)) return 0
    if (edge < 5) return 1
    if ((spec.glades ?? []).some((g) => near(x, y, g, g.r))) return 0.12
    return spec.density
  }

  const kinds = TREE_KINDS[spec.theme]
  const trees: PlacedObject[] = []
  for (let gy = -2; gy < MAP_H; gy += 3) {
    for (let gx = -1; gx < MAP_W; gx += 3) {
      const x = gx + (hash01(gx, gy, 1) < 0.5 ? 0 : 1)
      const y = gy + (hash01(gx, gy, 2) < 0.5 ? 0 : 1)
      // The trunk's base tile: (x + 1, y + 3)
      const bx = x + 1
      const by = y + 3
      if (by >= MAP_H) continue
      if (hash01(gx, gy, 3) >= density(bx, by)) continue
      // Keep trunks a tile clear of roads and water (crowns may overhang)
      if (!allGrass(bx - 1, by - 1, 3, 3)) continue
      const share = by < 40 ? spec.pines.north : spec.pines.south
      const pine = hash01(gx, gy, 4) < share
      trees.push({
        kind: pine ? kinds.pine : kinds.oak,
        x,
        y: pine ? y - 1 : y,
      })
    }
  }

  return {
    id: spec.id,
    name: spec.name,
    theme: spec.theme,
    terrain,
    objects: [
      ...trees,
      ...(spec.barrels ?? []).map((b) => ({ kind: 'barrel', ...b })),
    ],
    solids: [
      ...sites.map((s) => campfireSolid(s.position)),
      ...gates.map((g) => g.area),
    ],
    spawn: spec.entry,
  }
}
