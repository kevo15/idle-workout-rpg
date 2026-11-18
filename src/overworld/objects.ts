import type { Rect } from './mapTypes'

// Map objects (ported from Shadow Sprinter). Every number is in art pixels,
// relative to the object's top-left. `parts` are drawn depth-sorted with the
// hero by the bottom of the collider, so you walk behind a tree north of its
// trunk and in front of it south of it.
//
// Sheets: LPC trunk / treetop / barrel (assets/overworld/tiles, ASSETS.md),
// and the crowns recoloured by `npm run maps:build`: treetop_autumn (Fallen
// Kingdom) and treetop_ash (Ashen Wastes).

export type SheetName =
  'trunk' | 'treetop' | 'treetop_autumn' | 'treetop_ash' | 'barrel'

export type ObjectPart = {
  sheet: SheetName
  /** Crop from the sheet. */
  sx: number
  sy: number
  w: number
  h: number
  /** Where the crop lands inside the object. */
  dx: number
  dy: number
}

export type ObjectKind = {
  /** Drawn in order, so later parts cover earlier ones (crown over trunk). */
  parts: ObjectPart[]
  /** Blocked footprint. Its bottom edge is the depth-sort line. */
  collider: Rect
}

type CrownSheet = 'treetop' | 'treetop_autumn' | 'treetop_ash'

const lpcTree = (
  crown: CrownSheet,
  crownY: number,
  crownH: number,
  trunkX: number,
  trunkY: number
): ObjectKind => ({
  parts: [
    { sheet: 'trunk', sx: trunkX, sy: 0, w: 96, h: 96, dx: 0, dy: trunkY },
    { sheet: crown, sx: 0, sy: crownY, w: 96, h: crownH, dx: 0, dy: 0 },
  ],
  // Trunk and root flare
  collider: { x: 32, y: trunkY + 50, width: 32, height: 18 },
})

export const OBJECTS: Record<string, ObjectKind> = {
  /** Leafy oak: 3 tiles wide, trunk base at tile row 3 of the object. */
  tree: lpcTree('treetop', 0, 96, 0, 48),
  /** Pine: taller crown. */
  pine: lpcTree('treetop', 96, 128, 96, 64),
  tree_autumn: lpcTree('treetop_autumn', 0, 96, 0, 48),
  pine_autumn: lpcTree('treetop_autumn', 96, 128, 96, 64),
  tree_ash: lpcTree('treetop_ash', 0, 96, 0, 48),
  pine_ash: lpcTree('treetop_ash', 96, 128, 96, 64),
  barrel: {
    parts: [{ sheet: 'barrel', sx: 0, sy: 8, w: 34, h: 52, dx: 0, dy: 0 }],
    collider: { x: 3, y: 24, width: 28, height: 24 },
  },
}

/** Depth-sort line of a placed object, in map pixels. */
export const baselineOf = (kind: ObjectKind, topY: number) =>
  topY + kind.collider.y + kind.collider.height
