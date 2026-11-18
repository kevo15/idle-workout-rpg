// Ported from Shadow Sprinter.
import type { Point, Rect } from './mapTypes'

// The player collides with a small box at their feet, the usual top-down
// footprint: the head and body can overlap a wall or tree trunk, the feet
// can't. Kept shallow so walking up to something from the south stops about
// as close as walking down to it from the north.
export const FOOT_W = 16
export const FOOT_H = 6

export const footBox = (p: Point): Rect => ({
  x: p.x - FOOT_W / 2,
  y: p.y - FOOT_H,
  width: FOOT_W,
  height: FOOT_H,
})

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y

/**
 * Moves the feet at `p` by (dx, dy) one axis at a time, stopping at solids
 * and the map edge. Separate axes let you slide along a wall while pushing
 * into it diagonally. Steps are a few pixels, far smaller than any solid,
 * so nothing can be tunnelled through.
 */
export function moveFeet(
  p: Point,
  dx: number,
  dy: number,
  solids: Rect[],
  bounds: { width: number; height: number }
): Point {
  let x = Math.max(FOOT_W / 2, Math.min(bounds.width - FOOT_W / 2, p.x + dx))
  for (const s of solids) {
    const box = footBox({ x, y: p.y })
    if (!overlaps(box, s)) continue
    x = dx > 0 ? s.x - FOOT_W / 2 : s.x + s.width + FOOT_W / 2
  }
  let y = Math.max(FOOT_H, Math.min(bounds.height, p.y + dy))
  for (const s of solids) {
    const box = footBox({ x, y })
    if (!overlaps(box, s)) continue
    y = dy > 0 ? s.y : s.y + s.height + FOOT_H
  }
  return { x, y }
}

export const isBlocked = (p: Point, solids: Rect[]) =>
  solids.some((s) => overlaps(footBox(p), s))
