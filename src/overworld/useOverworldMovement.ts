// Walking around an overworld map (ported from Shadow Sprinter, trimmed to
// plain walking: no clones, hops or fights).
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Animated } from 'react-native'

import { moveFeet } from './collision'
import { runFixedStep } from './fixedStep'
import { TILE, type Facing, type MapDef, type Point } from './mapTypes'
import { mapSize, solidRects } from './terrain'

export type StickVector = { x: number; y: number }

/** Art pixels per 60Hz step at full stick: about 4 tiles a second. */
export const WALK_SPEED = 2.2

/** Which way to face for a movement direction; keeps `prev` when standing still. */
export function facingFor(vx: number, vy: number, prev: Facing): Facing {
  if (vx === 0 && vy === 0) return prev
  // Slight bias to the side views on exact diagonals, where the LPC side
  // walk reads better than the back/front one.
  if (Math.abs(vx) >= Math.abs(vy) * 0.95) return vx < 0 ? 'left' : 'right'
  return vy < 0 ? 'up' : 'down'
}

/** Left/top offset of a camera centred on `feet`, kept inside the map. */
export function cameraFor(feet: number, mapLen: number, viewLen: number) {
  if (mapLen <= viewLen) return (mapLen - viewLen) / 2
  return Math.max(0, Math.min(mapLen - viewLen, feet - viewLen / 2))
}

type Options = {
  map: MapDef
  /** Screen points per art pixel. */
  scale: number
  viewport: { width: number; height: number }
  stickRef: RefObject<StickVector>
  /** True while a panel or the story covers the map: the hero stands still. */
  isPausedRef: RefObject<boolean>
  /** Called with the feet position every step. Keep it cheap. */
  onMove?: (feet: Point) => void
  /** Where the feet start, in tiles (default: the map's spawn). */
  spawn?: Point
}

/**
 * Walks the hero around `map` from the joystick at a fixed 60Hz. The feet
 * and camera are Animated values written every step; React state changes
 * only when the facing or walking/standing flips.
 */
export function useOverworldMovement({
  map,
  scale,
  viewport,
  stickRef,
  isPausedRef,
  onMove,
  spawn,
}: Options) {
  const solids = useMemo(() => solidRects(map), [map])
  const bounds = useMemo(() => mapSize(map), [map])

  const start = spawn ?? map.spawn
  const posRef = useRef<Point>({ x: start.x * TILE, y: start.y * TILE })
  const feetX = useRef(new Animated.Value(0)).current
  const feetY = useRef(new Animated.Value(0)).current
  const camX = useRef(new Animated.Value(0)).current
  const camY = useRef(new Animated.Value(0)).current

  const [facing, setFacing] = useState<Facing>('down')
  const [moving, setMoving] = useState(false)
  const facingRef = useRef<Facing>('down')
  const movingRef = useRef(false)

  // Latest scale/viewport/callback for the loop, which outlives a rotation
  const viewRef = useRef({ scale, viewport, onMove })
  viewRef.current = { scale, viewport, onMove }
  const placeRef = useRef<() => void>(() => {})

  useEffect(() => {
    const place = () => {
      const { scale: s, viewport: v, onMove: moved } = viewRef.current
      const p = posRef.current
      feetX.setValue(p.x * s)
      feetY.setValue(p.y * s)
      camX.setValue(-cameraFor(p.x * s, bounds.width * s, v.width))
      camY.setValue(-cameraFor(p.y * s, bounds.height * s, v.height))
      moved?.(p)
    }
    placeRef.current = place
    place()
    return runFixedStep(
      () => {
        const stick = stickRef.current ?? { x: 0, y: 0 }
        const walking = stick.x !== 0 || stick.y !== 0
        if (walking) {
          posRef.current = moveFeet(
            posRef.current,
            stick.x * WALK_SPEED,
            stick.y * WALK_SPEED,
            solids,
            bounds
          )
        }
        place()
        const f = facingFor(stick.x, stick.y, facingRef.current)
        if (f !== facingRef.current) {
          facingRef.current = f
          setFacing(f)
        }
        if (walking !== movingRef.current) {
          movingRef.current = walking
          setMoving(walking)
        }
      },
      { isPausedRef: isPausedRef as { current: boolean } }
    )
  }, [solids, bounds, stickRef, isPausedRef, feetX, feetY, camX, camY])

  // Re-place on every size change (rotation) so nothing keeps the old scale
  useEffect(() => {
    placeRef.current()
  }, [scale, viewport.width, viewport.height])

  return { feetX, feetY, camX, camY, facing, moving, posRef, bounds }
}
