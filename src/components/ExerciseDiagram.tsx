/**
 * An exercise's how-to diagram: a stick figure looping smoothly through the
 * key poses in src/diagrams/poses.ts. Animated on the UI thread (Reanimated),
 * so it never re-renders React. With Reduce Motion on it holds the second
 * pose (the "working" position).
 */
import { useEffect, useMemo } from 'react'
import { View } from 'react-native'
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg'

import type { Exercise } from '../../rpg/exercises'
import {
  diagramFor,
  FAR_BONES,
  FLOOR,
  fullPose,
  GRID,
  JOINTS,
  NEAR_BONES,
  type Diagram,
  type Joint,
  type Prop,
} from '../diagrams/poses'
import { C } from '../theme/tokens'

const ALine = Animated.createAnimatedComponent(Line)
const ACircle = Animated.createAnimatedComponent(Circle)

/** Each joint's x and y in every pose: track[joint] = [xs, ys]. */
type Tracks = Record<Joint, [number[], number[]]>

function tracksOf(d: Diagram): Tracks {
  const poses = d.poses.map(fullPose)
  const out = {} as Tracks
  for (const j of JOINTS)
    out[j] = [poses.map((p) => p[j][0]), poses.map((p) => p[j][1])]
  return out
}

/** Position along the loop: pose i blending into pose i + 1. */
function at(xs: number[], t: number) {
  'worklet'
  const n = xs.length
  const i = Math.floor(t) % n
  const f = t - Math.floor(t)
  const e = f * f * (3 - 2 * f) // ease in-out
  return xs[i] + (xs[(i + 1) % n] - xs[i]) * e
}

function Bone({
  t,
  a,
  b,
  color,
  width,
  opacity = 1,
}: {
  t: SharedValue<number>
  a: [number[], number[]]
  b: [number[], number[]]
  color: string
  width: number
  opacity?: number
}) {
  const props = useAnimatedProps(() => ({
    x1: at(a[0], t.value),
    y1: at(a[1], t.value),
    x2: at(b[0], t.value),
    y2: at(b[1], t.value),
  }))
  return (
    <ALine
      animatedProps={props}
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      opacity={opacity}
    />
  )
}

function Toe({
  t,
  f,
  color,
  width,
  opacity = 1,
}: {
  t: SharedValue<number>
  f: [number[], number[]]
  color: string
  width: number
  opacity?: number
}) {
  const props = useAnimatedProps(() => {
    const x = at(f[0], t.value)
    const y = at(f[1], t.value)
    return { x1: x, y1: y, x2: x + 5, y2: Math.min(y + 1, FLOOR) }
  })
  return (
    <ALine
      animatedProps={props}
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      opacity={opacity}
    />
  )
}

function Head({
  t,
  h,
  color,
}: {
  t: SharedValue<number>
  h: [number[], number[]]
  color: string
}) {
  const props = useAnimatedProps(() => ({
    cx: at(h[0], t.value),
    cy: at(h[1], t.value),
  }))
  return <ACircle animatedProps={props} r={5} fill={color} />
}

function PropShape({ prop }: { prop: Prop }) {
  if (prop.kind === 'wall')
    return (
      <Rect
        x={prop.x}
        y={0}
        width={4}
        height={FLOOR}
        fill={C.steel}
        opacity={0.8}
      />
    )
  // A chair seen from the side: seat, legs and a back on the far side
  const { x, seat, facing } = prop
  const back = facing === 'right' ? x : x + 14
  return (
    <Path
      d={`M${x} ${seat}h14M${x + 1} ${seat}V${FLOOR}M${x + 13} ${seat}V${FLOOR}M${back} ${seat}V${seat - 18}`}
      stroke={C.steel}
      strokeWidth={2.5}
      strokeLinecap="round"
      fill="none"
    />
  )
}

export function ExerciseDiagram({
  exercise,
  width,
  color = C.chalk,
  still = false,
}: {
  exercise: Exercise
  /** Screen width; height follows the 120 x 80 grid. */
  width: number
  color?: string
  /** Hold the working pose (long lists: animating dozens at once is heavy). */
  still?: boolean
}) {
  const diagram = diagramFor(exercise)
  const reduced = useReducedMotion()
  const t = useSharedValue(1)
  const n = diagram?.poses.length ?? 1
  const tracks = useMemo(() => (diagram ? tracksOf(diagram) : null), [diagram])

  useEffect(() => {
    if (!diagram || reduced || still) {
      t.value = 1
      return
    }
    t.value = 0
    t.value = withRepeat(
      withTiming(n, { duration: n * diagram.ms, easing: Easing.linear }),
      -1,
      false
    )
    return () => cancelAnimation(t)
  }, [diagram, n, reduced, still, t])

  const height = (width * GRID.height) / GRID.width
  if (!diagram || !tracks) return <View style={{ width, height }} />
  const stroke = 3.2
  const side = diagram.view === 'side'
  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${GRID.width} ${GRID.height}`}
      accessibilityLabel={`How to do ${exercise.name.toLowerCase()}`}
    >
      <Line
        x1={4}
        y1={FLOOR + 1.5}
        x2={116}
        y2={FLOOR + 1.5}
        stroke={C.steel}
        strokeWidth={1.5}
      />
      {diagram.props?.map((p, i) => (
        <PropShape key={i} prop={p} />
      ))}
      {FAR_BONES.map(([a, b]) => (
        <Bone
          key={a + b}
          t={t}
          a={tracks[a]}
          b={tracks[b]}
          color={color}
          width={stroke}
          opacity={0.4}
        />
      ))}
      {side ? (
        <Toe t={t} f={tracks.F2} color={color} width={stroke} opacity={0.4} />
      ) : null}
      {NEAR_BONES.map(([a, b]) => (
        <Bone
          key={a + b}
          t={t}
          a={tracks[a]}
          b={tracks[b]}
          color={color}
          width={stroke}
        />
      ))}
      {side ? <Toe t={t} f={tracks.F1} color={color} width={stroke} /> : null}
      <Head t={t} h={tracks.H} color={color} />
    </Svg>
  )
}
