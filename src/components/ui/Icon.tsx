/** Icons used by the mockups (Lucide-style paths copied verbatim from docs/mockups). */
import Svg, { Circle, Path, Rect } from 'react-native-svg'

const STROKE: Record<string, string[]> = {
  home: ['M3 11 12 3l9 8', 'M5 9.5V21h5v-6h4v6h5V9.5'],
  swords: [
    'M14.5 17.5 3 6V3h3l11.5 11.5',
    'm13 19 6-6M16 16l4 4M19 21l2-2',
    'M14.5 6.5 18 3h3v3l-3.5 3.5',
    'm5 14 4 4M7 17l-3 3M3 19l2 2',
  ],
  bow: ['M5 19 19 5M13 5h6v6', 'M5 5c8 0 14 6 14 14', 'M3 21l3-1-2-2z'],
  bowSmall: ['M5 19 19 5M13 5h6v6', 'M5 5c8 0 14 6 14 14'],
  // Mage: a wand with sparks
  wand: [
    'm21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72',
    'm14 7 3 3M5 6v4M19 14v4M10 2v2M7 8H3M21 16h-4M11 3H9',
  ],
  // Summoner: an elemental spark
  sparkles: [
    'M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.14-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0l1.58 6.14a2 2 0 0 0 1.44 1.44l6.14 1.58a.5.5 0 0 1 0 .96l-6.14 1.58a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0z',
    'M20 3v4M22 5h-4',
  ],
  // Rogue: a single blade
  dagger: ['M14.5 17.5 3 6V3h3l11.5 11.5', 'm13 19 6-6M16 16l4 4M19 21l2-2'],
  dumbbell: ['M6 6v12M18 6v12M3 9v6M21 9v6M6 12h12'],
  shield: [
    'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z',
  ],
  map: [
    'M14.1 5.55a2 2 0 0 0 1.8 0l3.66-1.83A1 1 0 0 1 21 4.62v12.76a1 1 0 0 1-.55.9l-4.56 2.27a2 2 0 0 1-1.78 0l-4.22-2.1a2 2 0 0 0-1.78 0l-3.66 1.83A1 1 0 0 1 3 19.38V6.62a1 1 0 0 1 .55-.9l4.56-2.27a2 2 0 0 1 1.78 0z',
    'M15 5.76v15M9 3.24v15',
  ],
  swap: ['M4 8h14l-3-3M20 16H6l3 3'],
  check: ['m5 12 4 4 10-10'],
  x: ['M6 6l12 12M18 6 6 18'],
  chevron: ['m9 6 6 6-6 6'],
  trophy: [
    'M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22',
    'M18 2H6v7a6 6 0 0 0 12 0V2Z',
  ],
  flame: [
    'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z',
  ],
  retreat: ['M9 14 4 9l5-5', 'M4 9h11a5 5 0 0 1 0 10h-3'],
  settings: [
    'M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1',
  ],
  help: ['M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01'],
}

const FILL: Record<string, string> = {
  play: 'M7 4.5v15l12-7.5z',
  pause: 'M6 4h4v16H6zM14 4h4v16h-4z',
}

export type IconName = keyof typeof STROKE | keyof typeof FILL | 'lock' | 'coin'

/** Stroke paths of an outline icon (24 x 24), for drawing it inside a scene. */
export const iconPaths = (name: IconName): string[] => STROKE[name] ?? []

/** Each class's icon: big (crests) and small (the picker). */
export const CLASS_ICON: Record<
  'warrior' | 'archer' | 'mage' | 'summoner' | 'rogue',
  { big: IconName; small: IconName }
> = {
  warrior: { big: 'swords', small: 'swords' },
  archer: { big: 'bow', small: 'bowSmall' },
  mage: { big: 'wand', small: 'wand' },
  summoner: { big: 'sparkles', small: 'sparkles' },
  rogue: { big: 'dagger', small: 'dagger' },
}

export function Icon({
  name,
  size = 24,
  color = '#F4F1EA',
  strokeWidth = 2,
}: {
  name: IconName
  size?: number
  color?: string
  strokeWidth?: number
}) {
  if (name === 'coin') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={12} cy={12} r={9} fill="#F2B233" />
        <Circle
          cx={12}
          cy={12}
          r={5.5}
          fill="none"
          stroke="#9A6B0E"
          strokeWidth={1.6}
        />
      </Svg>
    )
  }
  if (name in FILL) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d={FILL[name]} fill={color} />
      </Svg>
    )
  }
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {name === 'lock' ? (
        <>
          <Rect x={3} y={11} width={18} height={11} rx={2} />
          <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </>
      ) : null}
      {name === 'settings' ? <Circle cx={12} cy={12} r={3} /> : null}
      {name === 'help' ? <Circle cx={12} cy={12} r={10} /> : null}
      {(STROKE[name] ?? []).map((d) => (
        <Path key={d} d={d} />
      ))}
    </Svg>
  )
}
