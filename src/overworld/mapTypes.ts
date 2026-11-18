// Top-down overworld maps, ported from Shadow Sprinter. Pure data shared by
// the app and the map build script (scripts/buildMaps.ts), so nothing here may
// import React Native.

/** Art pixels per tile. */
export const TILE = 32

export type Rect = { x: number; y: number; width: number; height: number }
export type Point = { x: number; y: number }

/** One terrain character per tile: '.' grass, 'd' dirt, 'w' water. */
export type TerrainChar = '.' | 'd' | 'w'

export type Facing = 'up' | 'left' | 'down' | 'right'

/** An object kind from objects.ts, placed with its top-left at tile (x, y). */
export type PlacedObject = { kind: string; x: number; y: number }

/**
 * How a map's art is tinted (scripts/buildMaps.ts recolours the LPC sheets):
 * green forest, autumn ruins, or grey ash with lava for water.
 */
export type MapTheme = 'forest' | 'kingdom' | 'ash'

export type MapDef = {
  id: string
  name: string
  theme: MapTheme
  /** Rows of TerrainChar, all the same length. */
  terrain: string[]
  objects: PlacedObject[]
  /** Extra blocked areas in tiles (campfires, gates). */
  solids?: Rect[]
  /** Where the hero arrives when camp isn't on this map, in tiles. */
  spawn: Point
}
