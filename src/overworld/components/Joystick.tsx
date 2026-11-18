// Ported from Shadow Sprinter, recoloured to the Iron Arena theme.
import React, { useEffect, useMemo, useRef } from 'react'
import {
  Animated,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'

import type { StickVector } from '../useOverworldMovement'
import { C } from '../../theme/tokens'

type Props = {
  /** Written on every move: -1..1 on each axis, length at most 1. */
  vectorRef: React.MutableRefObject<StickVector>
  /** The touch area. The stick appears wherever the thumb lands in it. */
  style?: StyleProp<ViewStyle>
  radius?: number
  /**
   * Keep the stick on screen at rest (dimmed, at `home`), springing back
   * there on release. Off: it shows only while touched.
   */
  alwaysShown?: boolean
  /** Rest spot in the touch area (default: its bottom-left corner). */
  home?: { x: number; y: number }
}

// Below this the stick reads as centred, so a resting thumb doesn't drift.
const DEAD_ZONE = 0.15
/** Opacity of a resting (untouched) stick. */
const REST_OPACITY = 0.45

/**
 * Floating thumbstick. Updates `vectorRef` and the knob directly, without
 * React state, so dragging it never re-renders anything.
 */
const Joystick: React.FC<Props> = ({
  vectorRef,
  style,
  radius = 56,
  alwaysShown = false,
  home,
}) => {
  const base = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current
  const knob = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current
  const shown = useRef(
    new Animated.Value(alwaysShown ? REST_OPACITY : 0)
  ).current
  const touching = useRef(false)
  const area = useRef<{ width: number; height: number } | null>(null)
  /** Where the stick rests: `home`, or the area's bottom-left. */
  const restSpot = () =>
    home ??
    (area.current
      ? { x: radius + 20, y: area.current.height - radius - 20 }
      : { x: radius + 20, y: radius + 20 })
  const restRef = useRef(restSpot)
  restRef.current = restSpot

  // A moved home (rotation, a new layout): the resting stick follows
  useEffect(() => {
    if (alwaysShown && !touching.current) base.setValue(restRef.current())
  }, [alwaysShown, base, home?.x, home?.y])

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    area.current = { width, height }
    if (alwaysShown && !touching.current) base.setValue(restRef.current())
  }

  const gesture = useMemo(() => {
    const release = () => {
      touching.current = false
      vectorRef.current = { x: 0, y: 0 }
      knob.setValue({ x: 0, y: 0 })
      if (!alwaysShown) {
        shown.setValue(0)
        return
      }
      // Back home, dimmed
      shown.setValue(REST_OPACITY)
      Animated.spring(base, {
        toValue: restRef.current(),
        useNativeDriver: true,
        speed: 22,
        bounciness: 4,
      }).start()
    }
    return Gesture.Pan()
      .runOnJS(true)
      .minDistance(0)
      .onBegin((e) => {
        touching.current = true
        base.stopAnimation()
        base.setValue({ x: e.x, y: e.y })
        knob.setValue({ x: 0, y: 0 })
        shown.setValue(1)
      })
      .onUpdate((e) => {
        const len = Math.hypot(e.translationX, e.translationY)
        const k = len > radius ? radius / len : 1
        const kx = e.translationX * k
        const ky = e.translationY * k
        knob.setValue({ x: kx, y: ky })
        const mag = Math.min(1, len / radius)
        vectorRef.current =
          mag < DEAD_ZONE ? { x: 0, y: 0 } : { x: kx / radius, y: ky / radius }
      })
      .onFinalize(release)
  }, [base, knob, shown, vectorRef, radius, alwaysShown])

  const size = radius * 2
  return (
    <GestureDetector gesture={gesture}>
      <View style={style} collapsable={false} onLayout={onLayout}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.base,
            {
              width: size,
              height: size,
              borderRadius: radius,
              marginLeft: -radius,
              marginTop: -radius,
              opacity: shown,
              transform: [{ translateX: base.x }, { translateY: base.y }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.knob,
              {
                left: radius - 24,
                top: radius - 24,
                transform: [{ translateX: knob.x }, { translateY: knob.y }],
              },
            ]}
          />
        </Animated.View>
      </View>
    </GestureDetector>
  )
}

const styles = StyleSheet.create({
  base: {
    position: 'absolute',
    left: 0,
    top: 0,
    backgroundColor: 'rgba(11,11,13,0.4)',
    borderWidth: 2,
    borderColor: 'rgba(138,143,153,0.55)',
  },
  knob: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(200,16,46,0.8)',
    borderWidth: 2,
    borderColor: C.gold,
  },
})

export default Joystick
