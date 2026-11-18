import type { MapDef } from '../mapTypes'
import { forest } from './forest'
import { kingdom } from './kingdom'
import { wastes } from './wastes'

/** Every overworld map, by id (a Region's mapId). */
export const MAPS: Record<string, MapDef> = { forest, kingdom, wastes }
