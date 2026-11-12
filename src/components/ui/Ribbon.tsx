/** Notched ribbons, tape tags and polygon fills. */
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import Svg, { Polygon } from 'react-native-svg'

import { C } from '../../theme/tokens'
import { T, type Font } from './Text'

export function TapeTag({
  label,
  tilt = -2,
  size = 10,
  pad = [3, 8],
}: {
  label: string
  tilt?: number
  size?: number
  pad?: [number, number]
}) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: C.chalk,
        paddingVertical: pad[0],
        paddingHorizontal: pad[1],
        borderRadius: 2,
        transform: [{ rotate: `${tilt}deg` }],
      }}
    >
      <T f="body800" size={size} color={C.floor} ls={0.14}>
        {label}
      </T>
    </View>
  )
}

/** clip-path: polygon(0 0, 100% 0, 92% 50%, 100% 100%, 0 100%, 8% 50%) */
function notchPoints(notch: number) {
  const a = notch
  const b = 100 - notch
  return `0,0 100,0 ${b},50 100,100 0,100 ${a},50`
}

/** A polygon filling its parent; sized from layout (absoluteFill SVGs misbehave on web). */
export function FillPolygon({
  points,
  fill,
}: {
  points: string
  fill: string
}) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={(e) =>
        setSize({
          w: e.nativeEvent.layout.width,
          h: e.nativeEvent.layout.height,
        })
      }
    >
      {size ? (
        <Svg
          width={size.w}
          height={size.h}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <Polygon points={points} fill={fill} />
        </Svg>
      ) : null}
    </View>
  )
}

export function Ribbon({
  label,
  size = 20,
  padX = 30,
  padTop = 5,
  padBottom = 3,
  notch = 8,
  ls = 0.04,
  font = 'display',
}: {
  label: string
  size?: number
  padX?: number
  padTop?: number
  padBottom?: number
  notch?: number
  ls?: number
  font?: Font
}) {
  const pts = notchPoints(notch)
  return (
    <View style={{ padding: 2, alignSelf: 'center' }}>
      <FillPolygon points={pts} fill={C.gold} />
      <View
        style={{
          paddingHorizontal: padX,
          paddingTop: padTop,
          paddingBottom: padBottom,
        }}
      >
        <FillPolygon points={pts} fill={C.crimson} />
        <T f={font} size={size} ls={ls} numberOfLines={1}>
          {label}
        </T>
      </View>
    </View>
  )
}
