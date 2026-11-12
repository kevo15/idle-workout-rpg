import { StyleSheet, View } from 'react-native'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'
import Svg, { Polygon } from 'react-native-svg'

import { useBeats } from '../arenabackground/beat'
import { progress } from '../arenabackground/keyframes'

/**
 * repeating-linear-gradient(45deg, color 0 10px, transparent 10px 20px),
 * sliding right by one period (28.28px) every `period` beats.
 */
export function HazardStripes({
  width,
  height,
  color,
  period = 2,
}: {
  width: number
  height: number
  color: string
  period?: number
}) {
  const beats = useBeats()
  const P = 28.284
  const band = P / 2
  const n = Math.ceil((width + height) / P) + 3
  const polys: string[] = []
  for (let i = -Math.ceil(height / P) - 2; i < n; i++) {
    const x = i * P
    polys.push(
      `${x},0 ${x + band},0 ${x + band + height},${height} ${x + height},${height}`
    )
  }
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: -P + P * progress(beats.value, { name: 'slide', period }) },
    ],
  }))
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}
    >
      <Animated.View
        style={[
          { position: 'absolute', left: 0, top: 0, width: width + P, height },
          style,
        ]}
      >
        <Svg width={width + P} height={height}>
          {polys.map((pts) => (
            <Polygon key={pts} points={pts} fill={color} />
          ))}
        </Svg>
      </Animated.View>
    </View>
  )
}
