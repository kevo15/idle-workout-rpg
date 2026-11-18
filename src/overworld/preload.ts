// Loads a map's images before its overworld shows, so the ground, trees and
// hero appear at once instead of popping in. The Overworld screen shows the
// LoadingScreen (with this progress) meanwhile.
import { Asset } from 'expo-asset'

import type { ClassId } from '../../rpg/types'
import { heroMapAnims, MAP_GROUNDS, MAP_MINIS, SHEETS } from './assets'

/** Every image module a map needs (the hero in `classId`'s look). */
export function mapModules(mapId: string, classId?: ClassId | null): number[] {
  const hero = heroMapAnims(classId)
  const ground = MAP_GROUNDS[mapId]
  return [
    ...(ground ? Object.values(ground.chunks) : []),
    ...(MAP_MINIS[mapId] !== undefined ? [MAP_MINIS[mapId]] : []),
    ...Object.values(SHEETS).map((s) => s.src),
    hero.idle.src,
    hero.walk.src,
  ]
}

/**
 * Downloads (in development) or reads from the app bundle each of the map's
 * images, reporting progress 0..1. A failed image doesn't stop the map:
 * React Native loads it again when it's drawn.
 */
export async function preloadMap(
  mapId: string,
  onProgress?: (done: number) => void,
  classId?: ClassId | null
): Promise<void> {
  const modules = mapModules(mapId, classId)
  let done = 0
  await Promise.all(
    modules.map((m) =>
      Asset.loadAsync(m)
        .catch(() => undefined)
        .finally(() => {
          done++
          onProgress?.(done / modules.length)
        })
    )
  )
}

/**
 * The images the first view needs on screen before the loading screen may
 * go: the ground chunks in view, each sheet the nearby objects use, the
 * hero (standing and running) and the mini-map. Keys match what the overworld's images report on load.
 */
export function firstViewImages(
  chunks: { col: number; row: number }[],
  near: { s: { kind: { parts: { sheet: string }[] } } }[]
): string[] {
  const sheets = new Set<string>()
  for (const { s } of near) for (const p of s.kind.parts) sheets.add(p.sheet)
  return [
    ...chunks.map((c) => `chunk:${c.col}-${c.row}`),
    ...[...sheets].map((sh) => `sheet:${sh}`),
    'hero',
    'hero-walk',
    'mini',
  ]
}

/** Share (0..1) of `required` already in `loaded`. */
export const loadedShare = (required: string[], loaded: ReadonlySet<string>) =>
  required.length
    ? required.filter((k) => loaded.has(k)).length / required.length
    : 0
