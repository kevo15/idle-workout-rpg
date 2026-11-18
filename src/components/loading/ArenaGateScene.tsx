/**
 * The loading scene from assets/loading-anim.html: the arena wall and
 * lamps, the stone arch with the forest beyond, the portcullis lifting, the
 * hero doing jumping jacks, floodlight beams, wisps and chalk dust.
 *
 * Static parts are SvgXml layers (arenaGateArt.ts, sliced from the HTML) on
 * one shared 1080 x 1920 frame; animated parts follow the HTML's CSS
 * keyframes, all driven by one Reanimated clock on the UI thread. Reduce
 * Motion holds a still frame.
 */
import { useEffect, useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'
import Svg, { ClipPath, Defs, G, Path, Rect, SvgXml } from 'react-native-svg'

import * as ART from './arenaGateArt'

export const SCENE_W = 1080
export const SCENE_H = 1920

/** `slice` fills the screen (cropping), `meet` shows it all. */
export type SceneFit = 'slice' | 'meet'

/** Scene unit -> screen point mapping for a `width` x `height` box. */
export function sceneMap(width: number, height: number, fit: SceneFit) {
  const k =
    fit === 'slice'
      ? Math.max(width / SCENE_W, height / SCENE_H)
      : Math.min(width / SCENE_W, height / SCENE_H)
  return { k, ox: (width - SCENE_W * k) / 2, oy: (height - SCENE_H * k) / 2 }
}

/** The clock runs this long, then restarts (a tiny hitch every 10 min). */
const CYCLE = 600

// ---- keyframes (worklets) ---------------------------------------------------

/** CSS ease-in-out per segment between keyframe `stops` (0..1). */
function kf(p: number, stops: number[], values: number[]) {
  'worklet'
  for (let i = 1; i < stops.length; i++) {
    if (p <= stops[i]) {
      const span = stops[i] - stops[i - 1]
      const f = span > 0 ? (p - stops[i - 1]) / span : 1
      const e = f * f * (3 - 2 * f)
      return values[i - 1] + (values[i] - values[i - 1]) * e
    }
  }
  return values[values.length - 1]
}

/** Phase 0..1 of a `period`-second loop started `delay` seconds in. */
function phase(t: number, period: number, delay = 0) {
  'worklet'
  const x = (t - delay) / period
  return x - Math.floor(x)
}

// ---- hero -------------------------------------------------------------------

const HERO_S = 1.4
/** A point in the hero's own drawing -> scene units (its 1.4x wrapper). */
const heroPt = (x: number, y: number) => ({
  x: 540 + (x - 540) * HERO_S,
  y: 1904 + (y - 1904) * HERO_S,
})

const HERO_BEAT = 0.9

function Spin({
  t,
  pivot,
  map,
  angle,
  children,
}: {
  t: SharedValue<number>
  pivot: { x: number; y: number }
  map: { k: number; ox: number; oy: number }
  angle: (p: number) => number
  children: React.ReactNode
}) {
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${angle(phase(t.value, HERO_BEAT))}deg` }],
  }))
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          transformOrigin: `${map.ox + pivot.x * map.k}px ${map.oy + pivot.y * map.k}px`,
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  )
}

// ---- small animated pieces --------------------------------------------------

function Fade({
  t,
  opacity,
  children,
}: {
  t: SharedValue<number>
  opacity: (t: number) => number
  children: React.ReactNode
}) {
  const style = useAnimatedStyle(() => ({ opacity: opacity(t.value) }))
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, style]}
    >
      {children}
    </Animated.View>
  )
}

function Dot({
  t,
  map,
  x,
  y,
  r,
  color,
  style: anim,
}: {
  t: SharedValue<number>
  map: { k: number; ox: number; oy: number }
  x: number
  y: number
  r: number
  color: string
  style: (t: number) => { dx: number; dy: number; o: number }
}) {
  const size = Math.max(1.5, 2 * r * map.k)
  const style = useAnimatedStyle(() => {
    const a = anim(t.value)
    return {
      opacity: a.o,
      transform: [{ translateX: a.dx * map.k }, { translateY: a.dy * map.k }],
    }
  })
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: map.ox + x * map.k - size / 2,
          top: map.oy + y * map.k - size / 2,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  )
}

// ---- portcullis: clipped to the arch, so drawn with animated SVG props -----

const ARect = Animated.createAnimatedComponent(Rect)
const APath = Animated.createAnimatedComponent(Path)
const GATE_PERIOD = 8
const gateLift = (t: number) => {
  'worklet'
  return kf(phase(t, GATE_PERIOD), [0, 0.45, 0.6, 1], [0, -55, -55, 0])
}

function Bar({ t, x }: { t: SharedValue<number>; x: number }) {
  const rect = useAnimatedProps(() => ({ y: 290 + gateLift(t.value) }))
  const spike = useAnimatedProps(() => {
    const y = 490 + gateLift(t.value)
    return { d: `M${x} ${y} L${x + 8} ${y + 30} L${x + 16} ${y} Z` }
  })
  return (
    <>
      <ARect animatedProps={rect} x={x} width={16} height={200} />
      <APath animatedProps={spike} />
    </>
  )
}

function Rail({ t, y }: { t: SharedValue<number>; y: number }) {
  const props = useAnimatedProps(() => ({ y: y + gateLift(t.value) }))
  return <ARect animatedProps={props} x={300} width={480} height={14} />
}

function Portcullis({ t, aspect }: { t: SharedValue<number>; aspect: string }) {
  return (
    <Svg
      style={StyleSheet.absoluteFill}
      viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}
      preserveAspectRatio={aspect}
      pointerEvents="none"
    >
      <Defs>
        <ClipPath id="gateOpen">
          <Path d="M300 1560 L300 540 A240 240 0 0 1 780 540 L780 1560 Z" />
        </ClipPath>
      </Defs>
      <G
        clipPath="url(#gateOpen)"
        fill="#1E1F24"
        stroke="#0B0B0D"
        strokeWidth={4}
      >
        {ART.PORTCULLIS.bars.map((x) => (
          <Bar key={x} t={t} x={x} />
        ))}
        {ART.PORTCULLIS.rails.map((y) => (
          <Rail key={y} t={t} y={y} />
        ))}
      </G>
    </Svg>
  )
}

// ---- the scene --------------------------------------------------------------

function Layer({ xml, aspect }: { xml: string; aspect: string }) {
  const sized = useMemo(
    () => xml.replace('<svg ', `<svg preserveAspectRatio="${aspect}" `),
    [xml, aspect]
  )
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <SvgXml xml={sized} width="100%" height="100%" />
    </View>
  )
}

const BEAM_PERIODS = [5, 7, 5]
/** Every other dust speck from the HTML: plenty, and lighter on phones. */
const DUST = ART.DUST.filter((_, i) => i % 2 === 0)

export function ArenaGateScene({
  width,
  height,
  fit,
}: {
  width: number
  height: number
  fit: SceneFit
}) {
  const map = sceneMap(width, height, fit)
  const aspect = fit === 'slice' ? 'xMidYMid slice' : 'xMidYMid meet'
  const reduced = useReducedMotion()
  const t = useSharedValue(0.2)

  useEffect(() => {
    if (reduced) return
    t.value = 0
    t.value = withRepeat(
      withTiming(CYCLE, { duration: CYCLE * 1000, easing: Easing.linear }),
      -1,
      false
    )
    return () => cancelAnimation(t)
  }, [reduced, t])

  const heroBounce = useAnimatedStyle(() => ({
    transform: [
      {
        translateY:
          kf(
            phase(t.value, HERO_BEAT),
            [0, 0.25, 0.5, 0.75, 1],
            [0, -26, 0, -26, 0]
          ) *
          HERO_S *
          map.k,
      },
    ],
  }))
  const shadowPivot = heroPt(540, 1904)
  const shadowStyle = useAnimatedStyle(() => {
    const p = phase(t.value, HERO_BEAT)
    const s = kf(p, [0, 0.25, 0.5, 0.75, 1], [1, 0.75, 1, 0.75, 1])
    return {
      opacity: kf(p, [0, 0.25, 0.5, 0.75, 1], [1, 0.59, 1, 0.59, 1]),
      transform: [{ scale: s }],
    }
  })

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: '#0B0B0D' }]}
    >
      <Layer xml={ART.BACK} aspect={aspect} />
      <Portcullis t={t} aspect={aspect} />
      {ART.WISPS.map((w, i) => {
        const anim = (tt: number) => {
          'worklet'
          const p = phase(tt, 6, w.delay)
          return {
            dx: kf(p, [0, 0.5, 1], [0, 10, 0]),
            dy: kf(p, [0, 0.5, 1], [0, -40, 0]),
            o: kf(p, [0, 0.5, 1], [0.6, 1, 0.6]),
          }
        }
        return (
          <View key={i} pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Dot
              t={t}
              map={map}
              x={w.x}
              y={w.y}
              r={w.glow}
              color="rgba(127,216,200,0.10)"
              style={anim}
            />
            <Dot
              t={t}
              map={map}
              x={w.x}
              y={w.y}
              r={w.core}
              color="rgba(244,241,234,0.55)"
              style={anim}
            />
          </View>
        )
      })}
      <Layer xml={ART.FLOOR_A} aspect={aspect} />
      <Fade
        t={t}
        opacity={(tt) => {
          'worklet'
          return kf(phase(tt, 4), [0, 0.5, 1], [1, 0.7, 1])
        }}
      >
        <Layer xml={ART.GOLD_GLOW} aspect={aspect} />
      </Fade>
      <Layer xml={ART.FLOOR_B} aspect={aspect} />

      {/* The hero: jumping jacks */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            transformOrigin: `${map.ox + shadowPivot.x * map.k}px ${map.oy + shadowPivot.y * map.k}px`,
          },
          shadowStyle,
        ]}
      >
        <Layer xml={ART.SHADOW} aspect={aspect} />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, heroBounce]}
      >
        <Spin
          t={t}
          map={map}
          pivot={heroPt(527, 1764)}
          angle={(p) => {
            'worklet'
            return kf(p, [0, 0.5, 1], [0, 16, 0])
          }}
        >
          <Layer xml={ART.LEG_L} aspect={aspect} />
        </Spin>
        <Spin
          t={t}
          map={map}
          pivot={heroPt(553, 1764)}
          angle={(p) => {
            'worklet'
            return kf(p, [0, 0.5, 1], [0, -16, 0])
          }}
        >
          <Layer xml={ART.LEG_R} aspect={aspect} />
        </Spin>
        <Layer xml={ART.TORSO} aspect={aspect} />
        <Spin
          t={t}
          map={map}
          pivot={heroPt(498, 1660)}
          angle={(p) => {
            'worklet'
            return kf(p, [0, 0.5, 1], [16, 165, 16])
          }}
        >
          <Layer xml={ART.ARM_L} aspect={aspect} />
        </Spin>
        <Spin
          t={t}
          map={map}
          pivot={heroPt(582, 1660)}
          angle={(p) => {
            'worklet'
            return kf(p, [0, 0.5, 1], [-16, -165, -16])
          }}
        >
          <Layer xml={ART.ARM_R} aspect={aspect} />
        </Spin>
      </Animated.View>

      {/* Floodlights */}
      {ART.BEAMS.map((xml, i) => (
        <Fade
          key={i}
          t={t}
          opacity={(tt) => {
            'worklet'
            return kf(
              phase(tt, BEAM_PERIODS[i]),
              [0, 0.5, 1],
              [0.85, 0.55, 0.85]
            )
          }}
        >
          <Layer xml={xml} aspect={aspect} />
        </Fade>
      ))}
      <Layer xml={ART.LAMPS} aspect={aspect} />
      {ART.BULBS.map((b, i) => (
        <Dot
          key={i}
          t={t}
          map={map}
          x={b.x}
          y={b.y}
          r={12}
          color="#F4F1EA"
          style={(tt) => {
            'worklet'
            // steps(1): full, then a quick double flicker near the end
            const p = phase(tt, 5, b.delay)
            const o = p < 0.91 ? 1 : p < 0.93 ? 0.6 : p < 0.95 ? 1 : 0.7
            return { dx: 0, dy: 0, o }
          }}
        />
      ))}

      {/* Chalk dust drifting down through the beams */}
      {DUST.map((d, i) => (
        <Dot
          key={i}
          t={t}
          map={map}
          x={d.x}
          y={d.y}
          r={d.r}
          color="#F4F1EA"
          style={(tt) => {
            'worklet'
            const p = phase(tt, d.dur, d.delay)
            const o =
              p < 0.15
                ? (p / 0.15) * d.o
                : p > 0.85
                  ? ((1 - p) / 0.15) * d.o
                  : d.o
            return { dx: 25 * p, dy: 140 * p, o }
          }}
        />
      ))}

      <Layer xml={ART.CALM} aspect={aspect} />
    </View>
  )
}
