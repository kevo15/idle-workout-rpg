/**
 * Full-screen loading screen: the arena gate scene (ArenaGateScene, from
 * assets/loading-anim.html) with the "WARMING UP..." panel: the title with
 * blinking dots and a gold bar that sweeps while the wait is unknown and
 * fills when `progress` is given. The subtitle (e.g. the region) and a
 * rotating tip sit below. Used while the overworld's map images load, and by
 * <LoadGate> for anything fetched from the database.
 *
 * Portrait shows the design as drawn. Landscape shows the whole scene in the
 * middle with the title and bar on the left and the tips on the right.
 *
 * Once `ready`, the bar shows full and the screen holds for `holdMs` (3 s by
 * default) before it fades out and unmounts itself.
 */
import { useEffect, useRef, useState } from 'react'
import {
  Animated as RNAnimated,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'

import { C, F } from '../../theme/tokens'
import { T } from '../ui'
import { ArenaGateScene, SCENE_H, SCENE_W, sceneMap } from './ArenaGateScene'

export const DEFAULT_TIPS = [
  'Every rep powers your raid.',
  'Rest days count. Your hero still raids.',
  'Too tough? Tap Easier. The reward stays the same.',
  'Claim your gold at Camp each morning.',
  'Tap any figure to see how a move is done.',
]

/** Seconds for the dots (1.5 s) and the sweep (1.8 s) to loop together. */
const LOOP = 9

/** One of the three title dots: on from 20% of its 1.5 s loop, staggered. */
function TitleDot({
  t,
  i,
  size,
}: {
  t: SharedValue<number>
  i: number
  size: number
}) {
  const style = useAnimatedStyle(() => {
    const x = (t.value - i * 0.25) / 1.5
    return { opacity: x - Math.floor(x) >= 0.2 ? 1 : 0 }
  })
  return (
    <Animated.Text style={[styles.title, { fontSize: size }, style]}>
      .
    </Animated.Text>
  )
}

/** The gold bar: fills to `progress`, or sweeps back and forth. */
function Bar({
  t,
  width,
  height,
  progress,
}: {
  t: SharedValue<number>
  width: number
  height: number
  progress: number | null
}) {
  const sweepW = width / 4
  const sweep = useAnimatedStyle(() => {
    const x = (t.value / 1.8) % 1
    const f = x < 0.5 ? x * 2 : 2 - x * 2
    const e = f * f * (3 - 2 * f)
    return { transform: [{ translateX: e * (width - sweepW) }] }
  })
  return (
    <View
      style={{
        width,
        height,
        borderRadius: height / 2,
        backgroundColor: C.crimson,
        overflow: 'hidden',
      }}
    >
      {progress === null ? (
        <Animated.View
          style={[
            {
              width: sweepW,
              height,
              borderRadius: height / 2,
              backgroundColor: C.gold,
            },
            sweep,
          ]}
        />
      ) : (
        <View
          style={{
            width: width * Math.max(0.04, Math.min(1, progress)),
            height,
            borderRadius: height / 2,
            backgroundColor: C.gold,
          }}
        />
      )}
    </View>
  )
}

function Title({
  t,
  title,
  size,
}: {
  t: SharedValue<number>
  title: string
  size: number
}) {
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'flex-end' }}
      accessible={false}
    >
      <Text
        style={[styles.title, { fontSize: size }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {title}
      </Text>
      {[0, 1, 2].map((i) => (
        <TitleDot key={i} t={t} i={i} size={size} />
      ))}
    </View>
  )
}

export function LoadingScreen({
  ready,
  title = 'WARMING UP',
  subtitle,
  tips = DEFAULT_TIPS,
  progress = null,
  holdMs = 3000,
  onHidden,
}: {
  /** True once whatever it waits for is done: it then fades out. */
  ready: boolean
  title?: string
  /** A line under the bar, e.g. the region being entered. */
  subtitle?: string
  tips?: string[]
  /** 0..1 when the progress is known; null sweeps. */
  progress?: number | null
  /** How long it stays after loading finishes, before fading out. */
  holdMs?: number
  onHidden?: () => void
}) {
  const { width, height } = useWindowDimensions()
  const landscape = width > height
  const [gone, setGone] = useState(false)
  const opacity = useRef(new RNAnimated.Value(1)).current

  // Clock for the title dots and the sweep
  const reduced = useReducedMotion()
  const t = useSharedValue(0.6)
  useEffect(() => {
    if (reduced) return
    t.value = 0
    t.value = withRepeat(
      withTiming(LOOP, { duration: LOOP * 1000, easing: Easing.linear }),
      -1,
      false
    )
    return () => cancelAnimation(t)
  }, [reduced, t])

  // Fade out once ready, after the minimum time on screen
  useEffect(() => {
    if (!ready) return
    const timer = setTimeout(() => {
      RNAnimated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setGone(true)
        onHidden?.()
      })
    }, holdMs)
    return () => clearTimeout(timer)
  }, [ready, holdMs, opacity, onHidden])

  // One tip every few seconds
  const [tip, setTip] = useState(() =>
    Math.floor(Math.random() * Math.max(1, tips.length))
  )
  useEffect(() => {
    if (tips.length <= 1) return
    const timer = setInterval(() => setTip((i) => (i + 1) % tips.length), 2800)
    return () => clearInterval(timer)
  }, [tips.length])

  if (gone) return null
  // Done loading: the bar shows full for the hold
  const shown = ready ? 1 : progress
  const tipText = tips.length ? tips[tip % tips.length] : null
  const label = `${title}${subtitle ? `, ${subtitle}` : ''}`

  if (landscape) {
    // Whole scene in the middle, text beside it
    const map = sceneMap(width, height, 'meet')
    const side = Math.max(0, map.ox)
    return (
      <RNAnimated.View
        accessibilityRole="progressbar"
        accessibilityLabel={label}
        style={[StyleSheet.absoluteFill, styles.root, { opacity }]}
      >
        <ArenaGateScene width={width} height={height} fit="meet" />
        <View style={[styles.sideCol, { left: 0, width: side }]}>
          <Title t={t} title={title} size={36} />
          <Bar
            t={t}
            width={Math.min(240, side - 48)}
            height={6}
            progress={shown}
          />
          {subtitle ? (
            <T f="body700" size={12} ls={0.16} color={C.gold}>
              {subtitle.toUpperCase()}
            </T>
          ) : null}
        </View>
        <View style={[styles.sideCol, { right: 0, width: side }]}>
          {tipText ? (
            <T size={14} lh={1.5} color={C.mist} align="center">
              {tipText}
            </T>
          ) : null}
        </View>
      </RNAnimated.View>
    )
  }

  // Portrait: the design as drawn, mapped from scene units to the screen
  const map = sceneMap(width, height, 'slice')
  const at = (x: number, y: number) => ({
    left: map.ox + x * map.k,
    top: map.oy + y * map.k,
  })
  const panel = { ...at(190, 985), width: 700 * map.k, height: 150 * map.k }
  return (
    <RNAnimated.View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={[StyleSheet.absoluteFill, styles.root, { opacity }]}
    >
      <ArenaGateScene width={width} height={height} fit="slice" />
      <View
        style={[
          styles.panel,
          panel,
          { borderRadius: 20 * map.k, paddingTop: 18 * map.k },
        ]}
      >
        <Title t={t} title={title} size={Math.max(24, 76 * map.k)} />
      </View>
      <View style={{ position: 'absolute', ...at(300, 1108) }}>
        <Bar
          t={t}
          width={480 * map.k}
          height={Math.max(3, 6 * map.k)}
          progress={shown}
        />
      </View>
      <View
        style={{
          position: 'absolute',
          ...at(150, 1160),
          width: 780 * map.k,
          alignItems: 'center',
          gap: 8,
        }}
      >
        {subtitle ? (
          <T f="body700" size={13} ls={0.16} color={C.gold}>
            {subtitle.toUpperCase()}
          </T>
        ) : null}
        {tipText ? (
          <T size={14} lh={1.45} color={C.mist} align="center">
            {tipText}
          </T>
        ) : null}
      </View>
    </RNAnimated.View>
  )
}

/** The scene's shape, for anything laying out around it. */
export const LOADING_SCENE = { width: SCENE_W, height: SCENE_H }

const styles = StyleSheet.create({
  root: { backgroundColor: C.floorDeep, zIndex: 1000, elevation: 1000 },
  panel: {
    position: 'absolute',
    alignItems: 'center',
    backgroundColor: 'rgba(11,11,13,0.55)',
  },
  title: {
    fontFamily: F.display,
    color: C.chalk,
    letterSpacing: 2,
    textShadowColor: C.deepRed,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  sideCol: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
})
