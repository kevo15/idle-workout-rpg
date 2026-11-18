// One fighter frame, feet on the floor line (Shadow Sprinter's spriteWindow
// rule: LPC feet sit on row 62 of a 64 px cell; bigger frames are centred on
// that cell, so their feet are lower by half the extra size).
//
// Each animation is its own sheet. Swapping an <Image>'s source to a sheet
// that hasn't been decoded leaves the fighter blank for a moment, so a
// fighter can keep all its sheets mounted (`sheets`) and only the current
// one is shown: changing animation is then just a visibility switch.
import React from 'react'
import { Image, View } from 'react-native'

import type { FightAnim } from './sprites'

const LPC_CELL = 64
const LPC_FOOT_Y = 62

/** LPC rows: 0 up, 1 left, 2 down, 3 right. */
const ROW_LEFT = 1
const ROW_RIGHT = 3

function FighterSprite({
  anim,
  frame,
  facing,
  x,
  floorY,
  scale,
  tint,
  opacity = 1,
  sheets,
}: {
  anim: FightAnim
  frame: number
  facing: 1 | -1
  /** Feet position on screen. */
  x: number
  floorY: number
  /** Screen points per sheet pixel. */
  scale: number
  /** A brief flash colour over the sprite when hit. */
  tint?: string
  opacity?: number
  /**
   * Every sheet the fighter uses (sheetsOf), kept mounted and hidden so
   * switching animation never shows an undecoded sheet.
   */
  sheets?: FightAnim[]
}) {
  const fw = anim.frameWidth * scale
  const fh = anim.frameHeight * scale
  const footY = (anim.frameHeight - LPC_CELL) / 2 + LPC_FOOT_Y
  const row = anim.oneRow ? 0 : facing === 1 ? ROW_RIGHT : ROW_LEFT
  const col = frame % anim.columns
  // One keyed list, so a sheet keeps its <Image> (and its decoded pixels)
  // whether it's showing or not
  const all = [...(sheets ?? []).filter((s) => s.src !== anim.src), anim].sort(
    (p, q) => p.src - q.src
  )
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: Math.round(x - fw / 2),
        top: Math.round(floorY - footY * scale),
        width: fw,
        height: Math.min(fh, footY * scale + 2 * scale),
        overflow: 'hidden',
        opacity,
      }}
    >
      {all.map((s) =>
        s.src === anim.src ? (
          <Image
            key={s.src}
            source={s.src}
            fadeDuration={0}
            style={{
              position: 'absolute',
              left: -col * fw,
              top: -row * fh,
              width: anim.columns * fw,
              height: (anim.oneRow ? 1 : 4) * fh,
              tintColor: tint,
            }}
          />
        ) : (
          // Mounted, decoded, invisible
          <Image
            key={s.src}
            source={s.src}
            fadeDuration={0}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: s.columns * s.frameWidth * scale,
              height: (s.oneRow ? 1 : 4) * s.frameHeight * scale,
              opacity: 0,
            }}
          />
        )
      )}
    </View>
  )
}

export default React.memo(FighterSprite)
