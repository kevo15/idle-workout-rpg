import React, { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'
import Svg, {
  Defs,
  Ellipse,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg'
import { TILE, type Point } from '../mapTypes'

// Ported from Shadow Sprinter.

/**
 * A camp site's campfire: crossed logs, a flickering flame and a warm glow
 * on the ground showing how close you must stand to use it. `at` is its
 * base, in tiles. The current camp burns brighter (`lit`).
 */
export function Campfire({
  at,
  scale,
  zIndex,
  reach,
  reduceMotion,
  lit,
}: {
  at: Point
  scale: number
  zIndex: number
  /** Reach in tiles: the glow's size. */
  reach: number
  reduceMotion?: boolean
  /** Camp is set here. */
  lit?: boolean
}) {
  const flicker = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (reduceMotion) return
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(flicker, {
          toValue: 1,
          duration: 180,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(flicker, {
          toValue: 0.35,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(flicker, {
          toValue: 0.8,
          duration: 210,
          useNativeDriver: true,
        }),
        Animated.timing(flicker, {
          toValue: 0,
          duration: 170,
          useNativeDriver: true,
        }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [flicker, reduceMotion])

  const w = 34 * scale
  const h = 40 * scale
  const left = at.x * TILE * scale - w / 2
  const top = at.y * TILE * scale - h
  const glow = reach * 2 * TILE * scale
  return (
    <>
      {/* The heal area: a warm pool of light on the ground */}
      <View
        pointerEvents="none"
        style={[
          styles.glow,
          lit && styles.glowLit,
          {
            left: at.x * TILE * scale - glow / 2,
            top: at.y * TILE * scale - glow * 0.3,
            width: glow,
            height: glow * 0.6,
            borderRadius: glow / 2,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[styles.fire, { left, top, width: w, height: h, zIndex }]}
      >
        <Svg width={w} height={h} viewBox="0 0 34 40">
          <Defs>
            <RadialGradient
              id={`ember-${at.x}-${at.y}`}
              cx="50%"
              cy="80%"
              r="60%"
            >
              <Stop offset="0" stopColor="#FFE38A" stopOpacity="0.9" />
              <Stop offset="1" stopColor="#FF7A1A" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Ellipse
            cx="17"
            cy="35"
            rx="15"
            ry="5"
            fill={`url(#ember-${at.x}-${at.y})`}
          />
          {/* Stones ringing the fire */}
          <Ellipse cx="5" cy="35" rx="3.2" ry="2.2" fill="#6B6670" />
          <Ellipse cx="29" cy="35" rx="3.2" ry="2.2" fill="#6B6670" />
          <Ellipse cx="11" cy="38" rx="3" ry="2" fill="#5A5560" />
          <Ellipse cx="23" cy="38" rx="3" ry="2" fill="#5A5560" />
          {/* Crossed logs */}
          <Path d="M5 36 L27 29 L29 32 L7 39 Z" fill="#6B3A1E" />
          <Path d="M29 36 L7 29 L5 32 L27 39 Z" fill="#7E4524" />
          <Path d="M8 30.5 L10 31.5" stroke="#3E2010" strokeWidth="1" />
          <Path d="M26 30.5 L24 31.5" stroke="#3E2010" strokeWidth="1" />
        </Svg>
        {/* The flame, flickering over the logs */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: flicker.interpolate({
                inputRange: [0, 1],
                outputRange: [0.85, 1],
              }),
              transform: [
                {
                  scaleY: flicker.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1.08],
                  }),
                },
              ],
            },
          ]}
        >
          <Svg width={w} height={h} viewBox="0 0 34 40">
            <Path
              d="M17 4 C22 12 26 17 24 25 C23 30 20 32 17 32 C13 32 10 30 10 25 C9 19 14 15 17 4 Z"
              fill="#FF7A1A"
            />
            <Path
              d="M17 12 C20 18 22 21 21 26 C20 29 19 30 17 30 C15 30 13 29 13 26 C13 22 15 19 17 12 Z"
              fill="#FFB43A"
            />
            <Path
              d="M17 19 C18.5 22 19.5 24 19 27 C18.6 28.4 17.8 29 17 29 C16 29 15.2 28.4 15 27 C14.7 24.5 16 22.5 17 19 Z"
              fill="#FFF1B0"
            />
          </Svg>
        </Animated.View>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    zIndex: 1,
    backgroundColor: 'rgba(255, 150, 60, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 90, 0.35)',
  },
  glowLit: {
    backgroundColor: 'rgba(242, 178, 51, 0.24)',
    borderColor: 'rgba(242, 178, 51, 0.6)',
  },
  fire: { position: 'absolute' },
})
