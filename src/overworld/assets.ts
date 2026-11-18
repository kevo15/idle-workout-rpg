// Runtime images for the overworld. The ground chunks and mini-maps are made
// by `npm run maps:build`; rebuild after changing a map.
import type { ClassId } from '../../rpg/types'
import type { Facing } from './mapTypes'
import type { SheetName } from './objects'

/** Each map's ground, as chunk images by `${col}-${row}` (see CHUNK_W/H). */
export const MAP_GROUNDS: Record<
  string,
  { cols: number; rows: number; chunks: Record<string, number> }
> = {
  forest: {
    cols: 3,
    rows: 3,
    chunks: {
      '0-0': require('../../assets/overworld/maps/forest-ground-0-0.png'),
      '1-0': require('../../assets/overworld/maps/forest-ground-1-0.png'),
      '2-0': require('../../assets/overworld/maps/forest-ground-2-0.png'),
      '0-1': require('../../assets/overworld/maps/forest-ground-0-1.png'),
      '1-1': require('../../assets/overworld/maps/forest-ground-1-1.png'),
      '2-1': require('../../assets/overworld/maps/forest-ground-2-1.png'),
      '0-2': require('../../assets/overworld/maps/forest-ground-0-2.png'),
      '1-2': require('../../assets/overworld/maps/forest-ground-1-2.png'),
      '2-2': require('../../assets/overworld/maps/forest-ground-2-2.png'),
    },
  },
  kingdom: {
    cols: 3,
    rows: 3,
    chunks: {
      '0-0': require('../../assets/overworld/maps/kingdom-ground-0-0.png'),
      '1-0': require('../../assets/overworld/maps/kingdom-ground-1-0.png'),
      '2-0': require('../../assets/overworld/maps/kingdom-ground-2-0.png'),
      '0-1': require('../../assets/overworld/maps/kingdom-ground-0-1.png'),
      '1-1': require('../../assets/overworld/maps/kingdom-ground-1-1.png'),
      '2-1': require('../../assets/overworld/maps/kingdom-ground-2-1.png'),
      '0-2': require('../../assets/overworld/maps/kingdom-ground-0-2.png'),
      '1-2': require('../../assets/overworld/maps/kingdom-ground-1-2.png'),
      '2-2': require('../../assets/overworld/maps/kingdom-ground-2-2.png'),
    },
  },
  wastes: {
    cols: 3,
    rows: 3,
    chunks: {
      '0-0': require('../../assets/overworld/maps/wastes-ground-0-0.png'),
      '1-0': require('../../assets/overworld/maps/wastes-ground-1-0.png'),
      '2-0': require('../../assets/overworld/maps/wastes-ground-2-0.png'),
      '0-1': require('../../assets/overworld/maps/wastes-ground-0-1.png'),
      '1-1': require('../../assets/overworld/maps/wastes-ground-1-1.png'),
      '2-1': require('../../assets/overworld/maps/wastes-ground-2-1.png'),
      '0-2': require('../../assets/overworld/maps/wastes-ground-0-2.png'),
      '1-2': require('../../assets/overworld/maps/wastes-ground-1-2.png'),
      '2-2': require('../../assets/overworld/maps/wastes-ground-2-2.png'),
    },
  },
}

/** Mini-map images: MINI_PX pixels per tile. */
export const MAP_MINIS: Record<string, number> = {
  forest: require('../../assets/overworld/maps/forest-mini.png'),
  kingdom: require('../../assets/overworld/maps/kingdom-mini.png'),
  wastes: require('../../assets/overworld/maps/wastes-mini.png'),
}
export const MINI_PX = 2

/** Object sheets with their pixel size, for cropping one part out. */
export const SHEETS: Record<
  SheetName,
  { src: number; width: number; height: number }
> = {
  trunk: {
    src: require('../../assets/overworld/tiles/trunk.png'),
    width: 192,
    height: 96,
  },
  treetop: {
    src: require('../../assets/overworld/tiles/treetop.png'),
    width: 192,
    height: 224,
  },
  treetop_autumn: {
    src: require('../../assets/overworld/tiles/treetop_autumn.png'),
    width: 192,
    height: 224,
  },
  treetop_ash: {
    src: require('../../assets/overworld/tiles/treetop_ash.png'),
    width: 192,
    height: 224,
  },
  barrel: {
    src: require('../../assets/overworld/tiles/barrel.png'),
    width: 128,
    height: 64,
  },
}

/** LPC sheets: 4 rows, one per facing (see ROW_FOR). */
export type SheetAnim = {
  src: number
  frameWidth: number
  frameHeight: number
  columns: number
  frameCount: number
  /** One full cycle, in ms. */
  speed: number
}

export const ROW_FOR: Record<Facing, number> = {
  up: 0,
  left: 1,
  down: 2,
  right: 3,
}

/** One class's map sheets (the class fighter exports: 13 columns). */
const heroMap = (idle: number, run: number) =>
  ({
    idle: {
      src: idle,
      frameWidth: 64,
      frameHeight: 64,
      columns: 13,
      frameCount: 2,
      speed: 1000,
    },
    walk: {
      src: run,
      frameWidth: 64,
      frameHeight: 64,
      columns: 13,
      frameCount: 8,
      speed: 640,
    },
  }) satisfies Record<string, SheetAnim>

/** The hero on the map, in their class's look (assets/fighters/hero/*). */
export const HERO_MAP_ANIMS: Record<
  ClassId,
  { idle: SheetAnim; walk: SheetAnim }
> = {
  warrior: heroMap(
    require('../../assets/fighters/hero/warrior/idle.png'),
    require('../../assets/fighters/hero/warrior/run.png')
  ),
  archer: heroMap(
    require('../../assets/fighters/hero/archer/idle.png'),
    require('../../assets/fighters/hero/archer/run.png')
  ),
  mage: heroMap(
    require('../../assets/fighters/hero/mage/idle.png'),
    require('../../assets/fighters/hero/mage/run.png')
  ),
  summoner: heroMap(
    require('../../assets/fighters/hero/summoner/idle.png'),
    require('../../assets/fighters/hero/summoner/run.png')
  ),
  rogue: heroMap(
    require('../../assets/fighters/hero/rogue/idle.png'),
    require('../../assets/fighters/hero/rogue/run.png')
  ),
}

/** A class's map sheets (the Warrior's if unknown). */
export const heroMapAnims = (classId: ClassId | null | undefined) =>
  HERO_MAP_ANIMS[classId ?? 'warrior'] ?? HERO_MAP_ANIMS.warrior
