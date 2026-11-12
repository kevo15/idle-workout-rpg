/** Barbell stat bars and weight-plate progress rings. */
import { View } from 'react-native'
import Svg, { Circle, Text as SvgText } from 'react-native-svg'

import { C, F, STAT_COLOR, type StatKey } from '../../theme/tokens'
import { N, T } from './Text'

/** Barbell stat bar: plate end-caps either side of a filled bar. */
export function BarbellBar({
  segments,
  big = true,
}: {
  /** [fraction 0..1, color] — several segments stack left to right. */
  segments: [number, string][]
  big?: boolean
}) {
  const plate = big ? [6, 22, 4, 16] : [5, 18, 3, 13]
  const barH = big ? 10 : 8
  const cap = (w: number, h: number) => (
    <View
      style={{ width: w, height: h, borderRadius: 2, backgroundColor: C.steel }}
    />
  )
  return (
    <View
      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2 }}
    >
      {cap(plate[0], plate[1])}
      {cap(plate[2], plate[3])}
      <View
        style={{
          flex: 1,
          height: barH,
          borderRadius: 2,
          backgroundColor: C.ironTrack,
          flexDirection: 'row',
          overflow: 'hidden',
        }}
      >
        {segments.map(([f, color], i) => (
          <View
            key={i}
            style={{
              width: `${Math.max(0, Math.min(1, f)) * 100}%`,
              height: barH,
              backgroundColor: color,
              borderRadius: segments.length === 1 ? 2 : 0,
            }}
          />
        ))}
      </View>
      {cap(plate[2], plate[3])}
      {cap(plate[0], plate[1])}
    </View>
  )
}

export function StatRow({
  stat,
  value,
  fraction,
}: {
  stat: StatKey
  value: number
  fraction: number
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <T f="body700" size={12} ls={0.1} style={{ width: 34 }}>
        {stat}
      </T>
      <BarbellBar segments={[[fraction, STAT_COLOR[stat]]]} />
      <N size={32} lh={1} align="right" style={{ width: 36, paddingTop: 4 }}>
        {value}
      </N>
    </View>
  )
}

/** Small weight-plate ring (60-unit viewBox) used for progress chips. */
export function PlateRing({
  size = 60,
  fraction,
  label,
  labelColor = C.chalk,
  labelSize = 18,
  labelY = 36,
  a11y,
}: {
  size?: number
  fraction: number
  label: string
  labelColor?: string
  labelSize?: number
  labelY?: number
  a11y?: string
}) {
  const circ = 138.2
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      accessibilityLabel={a11y}
    >
      <Circle
        cx={30}
        cy={30}
        r={29}
        fill={C.ironDark}
        stroke={C.steel}
        strokeWidth={1.5}
      />
      <Circle
        cx={30}
        cy={30}
        r={22}
        fill="none"
        stroke={C.ironTrack}
        strokeWidth={9}
      />
      <Circle
        cx={30}
        cy={30}
        r={22}
        fill="none"
        stroke={C.gold}
        strokeWidth={9}
        strokeDasharray={`${circ}`}
        strokeDashoffset={circ * (1 - Math.max(0, Math.min(1, fraction)))}
        transform="rotate(-90 30 30)"
      />
      <Circle
        cx={30}
        cy={30}
        r={13}
        fill={C.iron}
        stroke={C.steel}
        strokeWidth={1.5}
      />
      <SvgText
        x={30}
        y={labelY}
        textAnchor="middle"
        fontFamily={F.num}
        fontSize={labelSize}
        fill={labelColor}
      >
        {label}
      </SvgText>
    </Svg>
  )
}
