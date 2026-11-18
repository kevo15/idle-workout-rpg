/**
 * An enemy to find, standing at its spot on the map (src/overworld/spots.ts):
 * the enemy idling, facing the hero's way, with a red dot bobbing over its
 * head (the same red as its mini-map dot).
 */
import React, { useEffect, useRef, useState } from 'react'
import { Animated, Easing, View } from 'react-native'

import { kindOf } from '../../../rpg/fight'
import FighterSprite from '../../fight/FighterSprite'
import { ENEMY_SKINS } from '../../fight/sprites'
import { C } from '../../theme/tokens'
import { TILE } from '../mapTypes'
import type { EnemySpot } from '../spots'
import { ENEMY_RED } from './MiniMap'

function SpotEnemy({
  spot,
  scale,
  zIndex,
}: {
  spot: EnemySpot
  /** Screen points per map pixel. */
  scale: number
  zIndex: number
}) {
  const anim = ENEMY_SKINS[kindOf(spot.enemy)].idle
  const [n, setN] = useState(0)
  useEffect(() => {
    const t = setInterval(
      () => setN((x) => (x + 1) % anim.frameCount),
      anim.speed / anim.frameCount
    )
    return () => clearInterval(t)
  }, [anim])
  const bob = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [bob])

  const x = (spot.x + 0.5) * TILE * scale
  const feet = (spot.y + 1) * TILE * scale
  const dot = 10 * scale
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: 0, top: 0, zIndex }}
    >
      <FighterSprite
        anim={anim}
        frame={anim.startFrame + n}
        facing={-1}
        x={x}
        floorY={feet}
        scale={scale}
      />
      <Animated.View
        style={{
          position: 'absolute',
          left: x - dot / 2,
          top: feet - 72 * scale,
          width: dot,
          height: dot,
          borderRadius: dot / 2,
          backgroundColor: ENEMY_RED,
          borderWidth: 2,
          borderColor: C.chalk,
          transform: [
            {
              translateY: bob.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -4 * scale],
              }),
            },
          ],
        }}
      />
    </View>
  )
}

export default React.memo(SpotEnemy)
