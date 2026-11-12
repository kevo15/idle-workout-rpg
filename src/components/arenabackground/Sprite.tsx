/**
 * Sprite: an animated piece of the scene, drawn with the mockup's own SVG
 * coordinates.
 *
 * `box` is a scene-space rectangle [x, y, w, h]. The sprite renders an
 * Animated.View over that rectangle with an <Svg viewBox> mapped to the same
 * rectangle, so children keep their original mockup coordinates. `pivot` is
 * the scene-space transform origin (replaces CSS transform-box/transform-origin).
 *
 * Sprites nest: inner sprites are positioned relative to their parent's box,
 * so a jogging body can carry its own swinging limbs.
 */
import { createContext, useContext, type ReactNode } from 'react'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'
import Svg from 'react-native-svg'

import { useBeats } from './beat'
import {
  PRESETS,
  progress,
  sampleTrack,
  type AnimSpec,
  type Prop,
} from './keyframes'

type Box = [number, number, number, number]
const Origin = createContext<[number, number]>([0, 0])

type Props = {
  box: Box
  pivot?: [number, number]
  anim?: AnimSpec | AnimSpec[]
  /** SVG content in scene coordinates. */
  svg?: ReactNode
  /** Nested sprites. */
  children?: ReactNode
}

export function Sprite({ box, pivot, anim, svg, children }: Props) {
  const [ox, oy] = useContext(Origin)
  const beats = useBeats()
  const [x, y, w, h] = box
  const px = (pivot ? pivot[0] : x + w / 2) - x
  const py = (pivot ? pivot[1] : y + h / 2) - y
  const specs = anim ? (Array.isArray(anim) ? anim : [anim]) : []

  const style = useAnimatedStyle(() => {
    const out: Record<Prop, number> = {
      rotate: 0,
      translateX: 0,
      translateY: 0,
      scale: 1,
      opacity: 1,
    }
    for (const spec of specs) {
      const preset = PRESETS[spec.name]
      const t = progress(beats.value, spec)
      const tracks = preset.tracks as Partial<
        Record<Prop, { o: number[]; v: number[] }>
      >
      for (const key in tracks) {
        const k = key as Prop
        const tr = tracks[k]
        if (!tr) continue
        const val = sampleTrack(tr, t, preset.ease)
        if (k === 'scale' || k === 'opacity') out[k] *= val
        else out[k] += val
      }
    }
    return {
      opacity: out.opacity,
      transform: [
        { translateX: out.translateX },
        { translateY: out.translateY },
        { rotate: `${out.rotate}deg` },
        { scale: out.scale },
      ],
    }
  })

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: x - ox,
          top: y - oy,
          width: w,
          height: h,
          transformOrigin: `${px}px ${py}px`,
        },
        specs.length ? style : null,
      ]}
    >
      {svg ? (
        <Svg
          width={w}
          height={h}
          viewBox={`${x} ${y} ${w} ${h}`}
          style={{ position: 'absolute', left: 0, top: 0 }}
        >
          {svg}
        </Svg>
      ) : null}
      {children ? (
        <Origin.Provider value={[x, y]}>{children}</Origin.Provider>
      ) : null}
    </Animated.View>
  )
}
