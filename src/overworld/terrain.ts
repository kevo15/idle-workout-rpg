import { OBJECTS } from './objects'
import { TILE, type MapDef, type Rect, type TerrainChar } from './mapTypes'

// Ported from Shadow Sprinter. LPC terrain sheets (grass.png, dirt.png,
// water.png) share one 3x6 layout of 32px tiles: an inner-corner block at
// cols 1-2 rows 0-1, the outer 3x3 edge block at rows 2-4, and plain fill
// tiles on row 5. Each map tile is built from four 16px quarters, and each
// quarter picks its source from the two neighbours on its side and the
// diagonal between them (the usual RPG autotile scheme), so any shape of dirt
// or water gets clean edges.

/** Source tile (col, row) for quarter (qx, qy) of a tile. qx/qy: 0 = left/top. */
export function quarterSource(
  side: boolean,
  vert: boolean,
  diag: boolean,
  qx: 0 | 1,
  qy: 0 | 1
): { col: number; row: number } {
  if (side && vert) {
    // Surrounded: plain fill, unless the diagonal is open (inner corner).
    return diag
      ? { col: 1, row: 3 }
      : { col: qx === 0 ? 2 : 1, row: qy === 0 ? 1 : 0 }
  }
  if (!side && !vert) return { col: qx === 0 ? 0 : 2, row: qy === 0 ? 2 : 4 }
  if (vert) return { col: qx === 0 ? 0 : 2, row: 3 }
  return { col: 1, row: qy === 0 ? 2 : 4 }
}

export type QuarterBlit = {
  /** Source pixel in the terrain sheet. */
  sx: number
  sy: number
  /** Destination pixel in the map. */
  dx: number
  dy: number
}

/** Stable per-tile pick from 0-6, so the fill variation is the same on every build. */
export const tileHash = (c: number, r: number) =>
  (((c * 73856093) ^ (r * 19349663)) >>> 0) % 7

/** Every 16px quarter to draw for terrain `kind`, in map pixels. */
export function autotile(terrain: string[], kind: TerrainChar): QuarterBlit[] {
  const at = (c: number, r: number) => {
    // Off-map counts as the same terrain, so shapes touching the edge run
    // off it instead of getting a border.
    if (r < 0 || r >= terrain.length || c < 0 || c >= terrain[r].length)
      return true
    return terrain[r][c] === kind
  }
  const out: QuarterBlit[] = []
  terrain.forEach((line, r) => {
    for (let c = 0; c < line.length; c++) {
      if (line[c] !== kind) continue
      // Tiles with no edge anywhere sometimes use one of the textured fills
      // on row 5 (ripples, pebbles) instead of the plain one.
      let interior = true
      for (let oy = -1; oy <= 1; oy++)
        for (let ox = -1; ox <= 1; ox++) {
          if (!at(c + ox, r + oy)) interior = false
        }
      const v = tileHash(c, r)
      const fill = interior && v < 3 ? { col: v, row: 5 } : null
      for (const qy of [0, 1] as const) {
        for (const qx of [0, 1] as const) {
          const ox = qx === 0 ? -1 : 1
          const oy = qy === 0 ? -1 : 1
          const src =
            fill ??
            quarterSource(
              at(c + ox, r),
              at(c, r + oy),
              at(c + ox, r + oy),
              qx,
              qy
            )
          out.push({
            sx: src.col * TILE + qx * 16,
            sy: src.row * TILE + qy * 16,
            dx: c * TILE + qx * 16,
            dy: r * TILE + qy * 16,
          })
        }
      }
    }
  })
  return out
}

export type PaintRect = {
  c: TerrainChar
  x: number
  y: number
  w: number
  h: number
}

/** Builds terrain rows: fills `width` x `height` with grass, then paints rects in order. */
export function paint(
  width: number,
  height: number,
  rects: PaintRect[]
): string[] {
  const grid = Array.from({ length: height }, () =>
    Array<string>(width).fill('.')
  )
  for (const { c, x, y, w, h } of rects) {
    for (let r = y; r < y + h; r++)
      for (let k = x; k < x + w; k++) {
        if (grid[r] && k >= 0 && k < width) grid[r][k] = c
      }
  }
  return grid.map((row) => row.join(''))
}

export const mapSize = (map: MapDef) => ({
  width: map.terrain[0].length * TILE,
  height: map.terrain.length * TILE,
})

// The LPC water sheet draws its bank inside the edge tiles, so a water tile
// is only solid from where the water itself starts. Measured from the art.
export const SHORE_INSET = { top: 12, bottom: 8, side: 6 }

/** Everything the hero can't walk into, in map pixels. */
export function solidRects(map: MapDef): Rect[] {
  const rects: Rect[] = []
  const water = (c: number, r: number) => map.terrain[r]?.[c] === 'w'
  // Water: one rect per run of tiles in a row that share the same top and
  // bottom inset, so a pond is a handful of rects.
  map.terrain.forEach((line, r) => {
    let run: Rect | null = null
    const flush = () => {
      if (run) rects.push(run)
      run = null
    }
    for (let c = 0; c < line.length; c++) {
      if (!water(c, r)) {
        flush()
        continue
      }
      const top = water(c, r - 1) ? 0 : SHORE_INSET.top
      const bottom = water(c, r + 1) ? 0 : SHORE_INSET.bottom
      const left = water(c - 1, r) ? 0 : SHORE_INSET.side
      const right = water(c + 1, r) ? 0 : SHORE_INSET.side
      const cell = {
        x: c * TILE + left,
        y: r * TILE + top,
        width: TILE - left - right,
        height: TILE - top - bottom,
      }
      const prev = run as Rect | null
      if (
        prev &&
        prev.y === cell.y &&
        prev.height === cell.height &&
        prev.x + prev.width === cell.x
      ) {
        prev.width += cell.width
      } else {
        flush()
        run = cell
      }
    }
    flush()
  })
  for (const o of map.objects) {
    const kind = OBJECTS[o.kind]
    // Flat objects (zero-size collider) only sort, they don't block
    if (!kind || !kind.collider.width || !kind.collider.height) continue
    rects.push({
      x: o.x * TILE + kind.collider.x,
      y: o.y * TILE + kind.collider.y,
      width: kind.collider.width,
      height: kind.collider.height,
    })
  }
  for (const s of map.solids ?? []) {
    rects.push({
      x: s.x * TILE,
      y: s.y * TILE,
      width: s.width * TILE,
      height: s.height * TILE,
    })
  }
  return rects
}
