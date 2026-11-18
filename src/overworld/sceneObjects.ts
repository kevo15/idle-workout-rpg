import { OBJECTS, baselineOf, type ObjectKind } from './objects'
import { TILE, type MapDef, type Point } from './mapTypes'

/** A map object resolved to map pixels (x/y = top-left), ready to draw. */
export type PlacedSprite = {
  key: string
  kind: ObjectKind
  x: number
  y: number
  /** Depth-sort line, in map pixels. */
  baseline: number
}

/** The map's objects in back-to-front order. */
export function placeSprites(map: MapDef): PlacedSprite[] {
  return map.objects
    .filter((o) => OBJECTS[o.kind])
    .map((o, i) => {
      const kind = OBJECTS[o.kind]
      const x = o.x * TILE
      const y = o.y * TILE
      return {
        key: `${o.kind}-${i}`,
        kind,
        x,
        y,
        baseline: baselineOf(kind, y),
      }
    })
    .sort((a, b) => a.baseline - b.baseline)
}

/** How many objects are behind feet at `y` (sorted baselines at or above it). */
export function depthBand(sprites: PlacedSprite[], y: number): number {
  let lo = 0
  let hi = sprites.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (sprites[mid].baseline <= y) lo = mid + 1
    else hi = mid
  }
  return lo
}

// ---- culling ---------------------------------------------------------------
// A 120 x 108 map has hundreds of trees and nine ground images. Only what's
// near the hero is drawn: the world is split into CELL-tile cells, and the
// screen re-renders only when the hero crosses into a new cell.

/** Culling cell size, in tiles. */
export const CELL = 12

/** The cell (column, row) holding map pixel `p`. */
export const cellOf = (p: Point) => ({
  cx: Math.floor(p.x / (CELL * TILE)),
  cy: Math.floor(p.y / (CELL * TILE)),
})

/**
 * Map-pixel rectangle to draw around the hero's cell: the cell plus enough
 * room for half the viewport (in map pixels) and a tall object's overhang on
 * every side.
 */
export function drawWindow(
  cell: { cx: number; cy: number },
  view: { width: number; height: number }
) {
  const size = CELL * TILE
  // Objects are up to 5 tiles tall/3 wide, drawn from their top-left
  const marginX = view.width / 2 + 4 * TILE
  const marginY = view.height / 2 + 6 * TILE
  return {
    x: cell.cx * size - marginX,
    y: cell.cy * size - marginY,
    width: size + 2 * marginX,
    height: size + 2 * marginY,
  }
}

const inRect = (
  r: { x: number; y: number; width: number; height: number },
  x: number,
  y: number
) => x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height

/**
 * The sprites inside `win`, each with its index in the full sorted list (its
 * depth order stays global, so zIndex is the same culled or not).
 */
export function spritesIn(
  sprites: PlacedSprite[],
  win: { x: number; y: number; width: number; height: number }
): { s: PlacedSprite; i: number }[] {
  const out: { s: PlacedSprite; i: number }[] = []
  sprites.forEach((s, i) => {
    if (inRect(win, s.x, s.y)) out.push({ s, i })
  })
  return out
}

/** Ground chunk size, in tiles: a map is baked as a grid of these images. */
export const CHUNK_W = 40
export const CHUNK_H = 36

/** Ground chunks (column, row) overlapping `win`, for a map of `cols` x `rows` chunks. */
export function chunksIn(
  win: { x: number; y: number; width: number; height: number },
  cols: number,
  rows: number
): { col: number; row: number }[] {
  const w = CHUNK_W * TILE
  const h = CHUNK_H * TILE
  const out: { col: number; row: number }[] = []
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < cols; col++) {
      const overlaps =
        col * w < win.x + win.width &&
        (col + 1) * w > win.x &&
        row * h < win.y + win.height &&
        (row + 1) * h > win.y
      if (overlaps) out.push({ col, row })
    }
  return out
}
