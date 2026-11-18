// The corner mini-map: the baked terrain image (MINI_PX px per tile) with
// the hero, the campfires and the gates on it. Tap it to open it full size.
import { useMemo } from 'react'
import { Animated, Image, Pressable, View } from 'react-native'

import type { CampSite, RegionGate } from '../../../rpg/world'
import { C } from '../../theme/tokens'
import { MAP_MINIS } from '../assets'
import { TILE, type MapDef } from '../mapTypes'

type AnimatedNumber = Parameters<typeof Animated.multiply>[0]

/** Enemies to find: bright red, unlike the crimson gate. */
export const ENEMY_RED = '#FF3B3B'

export function MiniMap({
  map,
  ptsPerTile,
  feetX,
  feetY,
  worldScale,
  sites,
  gates,
  campId,
  onPress,
  label,
  onLoad,
  enemies = [],
}: {
  map: MapDef
  /** Size of one tile on the mini-map, in screen points. */
  ptsPerTile: number
  /** The hero's feet in world-view points (from the movement loop). */
  feetX: AnimatedNumber
  feetY: AnimatedNumber
  /** World-view points per art pixel. */
  worldScale: number
  sites: CampSite[]
  gates: RegionGate[]
  /** The current camp: its fire is gold. */
  campId: string
  onPress?: () => void
  label: string
  /** Called once the mini-map image has loaded (or failed). */
  onLoad?: () => void
  /** Enemies to find, in tiles: red dots. */
  enemies?: { x: number; y: number }[]
}) {
  const cols = map.terrain[0].length
  const rows = map.terrain.length
  const w = cols * ptsPerTile
  const h = rows * ptsPerTile
  // World points -> mini points
  const k = ptsPerTile / (TILE * worldScale)
  const dot = 8
  const left = useMemo(
    () => Animated.add(Animated.multiply(feetX, k), -dot / 2),
    [feetX, k]
  )
  const top = useMemo(
    () => Animated.add(Animated.multiply(feetY, k), -dot / 2),
    [feetY, k]
  )
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={!onPress}
      style={{
        width: w + 4,
        height: h + 4,
        padding: 2,
        borderRadius: 6,
        backgroundColor: C.floor,
        borderWidth: 1,
        borderColor: C.steel,
      }}
    >
      <View
        style={{ width: w, height: h, overflow: 'hidden', borderRadius: 4 }}
      >
        <Image
          source={MAP_MINIS[map.id]}
          style={{ width: w, height: h }}
          onLoad={onLoad}
          onError={onLoad}
        />
        {gates.map((g) => (
          <View
            key={g.regionId}
            style={{
              position: 'absolute',
              left: g.area.x * ptsPerTile,
              top: g.area.y * ptsPerTile,
              width: g.area.width * ptsPerTile,
              height: Math.max(3, g.area.height * ptsPerTile),
              backgroundColor: C.crimson,
            }}
          />
        ))}
        {enemies.map((e, i) => (
          <View
            key={`enemy-${i}`}
            style={{
              position: 'absolute',
              left: e.x * ptsPerTile - 4,
              top: e.y * ptsPerTile - 4,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: ENEMY_RED,
              borderWidth: 1,
              borderColor: C.chalk,
            }}
          />
        ))}
        {sites.map((s) => {
          const size = s.id === campId ? 9 : 7
          return (
            <View
              key={s.id}
              style={{
                position: 'absolute',
                left: s.position.x * ptsPerTile - size / 2,
                top: s.position.y * ptsPerTile - size / 2,
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: s.id === campId ? C.gold : C.hype,
                borderWidth: 1,
                borderColor: C.floor,
              }}
            />
          )
        })}
        <Animated.View
          style={{
            position: 'absolute',
            left,
            top,
            width: dot,
            height: dot,
            borderRadius: dot / 2,
            backgroundColor: C.chalk,
            borderWidth: 2,
            borderColor: C.crimson,
          }}
        />
      </View>
    </Pressable>
  )
}
