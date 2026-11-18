// One LPC character at a feet position (ported from Shadow Sprinter's
// OverworldSprite). Position comes in as Animated values set by the movement
// loop, so walking never re-renders this; only a frame change does.
import React, { useEffect, useMemo, useState } from 'react'
import { Animated, Image, StyleSheet } from 'react-native'

import { ROW_FOR, type SheetAnim } from '../assets'
import type { Facing } from '../mapTypes'

type AnimatedNumber = Parameters<typeof Animated.add>[0]

/** LPC cells are 64px with the feet on row 62. */
const LPC_FOOT_Y = 62

function HeroSprite({
  anim,
  facing,
  x,
  y,
  scale,
  zIndex,
  onLoad,
}: {
  anim: SheetAnim
  facing: Facing
  /** Feet position in screen points inside the world view. */
  x: AnimatedNumber
  y: AnimatedNumber
  scale: number
  zIndex: number
  /** Called once the sheet's image has loaded (or failed). */
  onLoad?: () => void
}) {
  const [frame, setFrame] = useState(0)
  useEffect(() => {
    setFrame(0)
    if (anim.frameCount <= 1) return
    const id = setInterval(
      () => setFrame((f) => (f + 1) % anim.frameCount),
      anim.speed / anim.frameCount
    )
    return () => clearInterval(id)
  }, [anim])

  // The window is one frame, clipped at the feet, centred on the feet
  const w = anim.frameWidth * scale
  const h = LPC_FOOT_Y * scale
  const left = useMemo(() => Animated.add(x, -Math.round(w / 2)), [x, w])
  const top = useMemo(() => Animated.add(y, -Math.round(h)), [y, h])

  return (
    <Animated.View
      pointerEvents="none"
      collapsable={false}
      style={[styles.window, { zIndex, left, top, width: w, height: h }]}
    >
      <Image
        source={anim.src}
        onLoad={onLoad}
        onError={onLoad}
        style={{
          position: 'absolute',
          width: anim.frameWidth * anim.columns * scale,
          height: anim.frameHeight * 4 * scale,
          left: -frame * anim.frameWidth * scale,
          top: -ROW_FOR[facing] * anim.frameHeight * scale,
        }}
      />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  window: { position: 'absolute', overflow: 'hidden' },
})

export default React.memo(HeroSprite)
