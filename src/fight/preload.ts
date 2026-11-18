// Loads the fighters' sprite sheets before a fight starts, so no animation
// shows a blank frame the first time it plays (mirrors src/overworld/preload.ts).
import { Asset } from 'expo-asset'

import { sheetsOf, type FighterSkin } from './sprites'

/** Every sheet module the given skins use (no repeats). */
export const skinModules = (skins: FighterSkin[]) => [
  ...new Set(skins.flatMap((s) => sheetsOf(s).map((a) => a.src))),
]

/** Loads them; a failed sheet doesn't stop the fight (it loads when drawn). */
export async function preloadSkins(skins: FighterSkin[]): Promise<void> {
  await Promise.all(
    skinModules(skins).map((m) => Asset.loadAsync(m).catch(() => undefined))
  )
}
