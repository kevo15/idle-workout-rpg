/**
 * Ports of the mockup CSS @keyframes, evaluated on the UI thread from the shared
 * beat count. Each track is a list of [offset, value] stops, and easing applies
 * per segment (as in CSS).
 */
export type Ease = 'inOut' | 'out' | 'linear'
export type Prop = 'rotate' | 'translateX' | 'translateY' | 'scale' | 'opacity'
export type Track = { o: number[]; v: number[] }
export type Preset = { ease: Ease; tracks: Partial<Record<Prop, Track>> }

const t3 = (a: number, b: number): Track => ({ o: [0, 0.5, 1], v: [a, b, a] })

export const PRESETS = {
  swing: { ease: 'inOut', tracks: { rotate: t3(-8, 8) } },
  sway: { ease: 'inOut', tracks: { rotate: t3(-3, 3) } },
  swaySoft: { ease: 'inOut', tracks: { rotate: t3(-0.6, 0.6) } },
  flick: { ease: 'inOut', tracks: { opacity: t3(1, 0.75) } },
  flickSoft: { ease: 'inOut', tracks: { opacity: t3(1, 0.8) } },
  bob: { ease: 'inOut', tracks: { translateY: t3(0, -3) } },
  squat: { ease: 'inOut', tracks: { translateY: t3(0, 8) } },
  pushup: { ease: 'inOut', tracks: { translateY: t3(0, 5) } },
  jog: { ease: 'inOut', tracks: { translateY: t3(0, -4) } },
  breathe: { ease: 'inOut', tracks: { scale: t3(1, 1.02) } },
  breatheBig: { ease: 'inOut', tracks: { scale: t3(1, 1.03) } },
  jackL: { ease: 'inOut', tracks: { rotate: t3(0, 120) } },
  jackR: { ease: 'inOut', tracks: { rotate: t3(0, -120) } },
  legL: { ease: 'inOut', tracks: { rotate: t3(0, 20) } },
  legR: { ease: 'inOut', tracks: { rotate: t3(0, -20) } },
  flexL: { ease: 'inOut', tracks: { rotate: t3(30, 150) } },
  flexR: { ease: 'inOut', tracks: { rotate: t3(-30, -150) } },
  stride: { ease: 'inOut', tracks: { rotate: t3(24, -24) } },
  glow: { ease: 'inOut', tracks: { opacity: t3(0.85, 1) } },
  pulse: { ease: 'inOut', tracks: { opacity: t3(1, 0.55) } },
  gate: {
    ease: 'inOut',
    tracks: {
      translateY: { o: [0, 0.1, 0.4, 0.8, 1], v: [0, 0, -150, -150, 0] },
    },
  },
  puff: {
    ease: 'out',
    tracks: {
      opacity: { o: [0, 0.15, 1], v: [0, 0.4, 0] },
      translateY: { o: [0, 1], v: [0, -16] },
      scale: { o: [0, 1], v: [0.5, 1.6] },
    },
  },
  hr: { ease: 'linear', tracks: { translateX: { o: [0, 1], v: [0, -120] } } },
  slide: {
    ease: 'linear',
    tracks: { translateX: { o: [0, 1], v: [-28.28, 0] } },
  },
} satisfies Record<string, Preset>

export type PresetName = keyof typeof PRESETS

/**
 * One animation on an element.
 * - `period`: duration in beats (CSS `calc(var(--beat) * n)`).
 * - `offset`: beats to start ahead by. A CSS delay of `calc(var(--beat) * -2)` is offset 2.
 * - `reverse`: CSS `animation-direction: reverse`.
 */
export type AnimSpec = {
  name: PresetName
  period?: number
  offset?: number
  reverse?: boolean
}

export function ease(kind: Ease, x: number): number {
  'worklet'
  if (kind === 'linear') return x
  if (kind === 'out') return Math.sin((x * Math.PI) / 2)
  return 0.5 - 0.5 * Math.cos(Math.PI * x)
}

export function sampleTrack(track: Track, t: number, kind: Ease): number {
  'worklet'
  const { o, v } = track
  for (let i = 1; i < o.length; i++) {
    if (t <= o[i]) {
      const span = o[i] - o[i - 1]
      const x = span === 0 ? 1 : (t - o[i - 1]) / span
      return v[i - 1] + (v[i] - v[i - 1]) * ease(kind, x)
    }
  }
  return v[v.length - 1]
}

/** Local progress 0..1 of an animation at a given beat count. */
export function progress(beats: number, spec: AnimSpec): number {
  'worklet'
  const period = spec.period ?? 1
  let t = ((beats + (spec.offset ?? 0)) / period) % 1
  if (t < 0) t += 1
  return spec.reverse ? 1 - t : t
}
