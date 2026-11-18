// What flies across the arena (rpg/fight.ts projectiles), drawn as small
// pixel shapes in code: the Archer's arrow, the Mage's bolt and the
// Summoner's water balls.
// The Mage's staff thrusts fire fireballs and lightning bolts in turn.
// Positions are snapped to whole screen pixels to stay crisp.
import React from 'react'
import { View } from 'react-native'

import type { Projectile } from '../../rpg/fight'

const COLORS = {
  arrowShaft: '#8A5A2B',
  arrowTip: '#D9D9E0',
  arrowFletch: '#E8E2D0',
  bolt: '#9F7BFF',
  boltCore: '#F2ECFF',
  water: '#3FA9F5',
  waterCore: '#DDF3FF',
  fire: '#FF6A1A',
  fireOuter: '#C8102E',
  fireCore: '#FFE066',
  lightning: '#FFF27A',
  lightningGlow: '#7FD8FF',
}

/** A jagged lightning bolt: short pixel segments stepping up and down. */
function Lightning({
  x,
  y,
  dir,
  s,
}: {
  x: number
  y: number
  dir: number
  s: number
}) {
  const seg = 5 * s
  const steps = [0, -3, 2, -2, 3, 0]
  const h = Math.max(2, px(2 * s))
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: 0, top: 0 }}
    >
      {steps.map((dy, i) => {
        // Front segment at the head, trailing back
        const sx0 = x - dir * (i + 1) * seg
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: px(Math.min(sx0, sx0 + dir * seg)),
              top: px(y + dy * s - h / 2),
              width: px(seg + s),
              height: h,
              backgroundColor: i % 2 ? COLORS.lightningGlow : COLORS.lightning,
              opacity: 1 - i * 0.12,
            }}
          />
        )
      })}
    </View>
  )
}

const px = Math.round

/** One projectile at its spot. `sx` maps arena x to screen x. */
export function ProjectileView({
  p,
  sx,
  floorY,
  s,
}: {
  p: Projectile
  sx: (x: number) => number
  floorY: number
  /** Screen points per arena pixel. */
  s: number
}) {
  const x = sx(p.x)
  const y = floorY - p.z * s
  const dir = Math.sign(p.vx) || 1
  if (p.kind === 'arrow') {
    const len = 18 * s
    const h = Math.max(2, px(2 * s))
    const left = dir > 0 ? x - len : x
    return (
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: px(left),
          top: px(y - h / 2),
          width: px(len),
          height: h,
        }}
      >
        <View style={{ flex: 1, backgroundColor: COLORS.arrowShaft }} />
        {/* The head at the front, the fletching at the back */}
        <View
          style={{
            position: 'absolute',
            [dir > 0 ? 'right' : 'left']: -px(2 * s),
            top: -px(s),
            width: px(4 * s),
            height: h + px(2 * s),
            backgroundColor: COLORS.arrowTip,
          }}
        />
        <View
          style={{
            position: 'absolute',
            [dir > 0 ? 'left' : 'right']: 0,
            top: -px(s),
            width: px(4 * s),
            height: h + px(2 * s),
            backgroundColor: COLORS.arrowFletch,
          }}
        />
      </View>
    )
  }
  if (p.kind === 'lightning') return <Lightning x={x} y={y} dir={dir} s={s} />
  const r = (p.kind === 'fire' ? 7 : p.kind === 'bolt' ? 6 : 4) * s
  const glow =
    p.kind === 'fire'
      ? COLORS.fire
      : p.kind === 'bolt'
        ? COLORS.bolt
        : COLORS.water
  const core =
    p.kind === 'fire'
      ? COLORS.fireCore
      : p.kind === 'bolt'
        ? COLORS.boltCore
        : COLORS.waterCore
  const halo = p.kind === 'fire' ? COLORS.fireOuter : glow
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: px(x - r * 1.6),
        top: px(y - r * 1.6),
        width: px(r * 3.2),
        height: px(r * 3.2),
        borderRadius: px(r * 1.6),
        backgroundColor: halo + '55',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: px(r * 1.6),
          height: px(r * 1.6),
          borderRadius: px(r * 0.8),
          backgroundColor: glow,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: px(r * 0.7),
            height: px(r * 0.7),
            borderRadius: px(r * 0.35),
            backgroundColor: core,
          }}
        />
      </View>
    </View>
  )
}
