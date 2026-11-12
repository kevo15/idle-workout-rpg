/**
 * Story card overlay (docs/mockups/story.html), shown on the Map: Chapter 1
 * the first time the Map opens, later chapters as regions unlock, and any
 * seen chapter again from "Past scenes". Must render inside a <Screen>.
 */
import { Pressable, StyleSheet, View } from 'react-native'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'
import { Line, Rect } from 'react-native-svg'

import type { Chapter } from '../../../rpg/world'
import { useBeats } from '../arenabackground/beat'
import { PRESETS, progress, sampleTrack } from '../arenabackground/keyframes'
import { Floodlight } from '../arenabackground/parts'
import { SceneSvg, useCanvasHeight } from '../arenabackground/Screen'
import { FillPolygon, H, Ribbon, T, TapeTag } from '../ui'
import { C } from '../../theme/tokens'

/** A sign hanging from the rig: sways gently from its top edge. */
function useSway() {
  const beats = useBeats()
  return useAnimatedStyle(() => {
    const p = PRESETS.swaySoft
    const t = progress(beats.value, { name: 'swaySoft', period: 8 })
    return {
      transform: [{ rotate: `${sampleTrack(p.tracks.rotate, t, p.ease)}deg` }],
    }
  })
}

function usePulse() {
  const beats = useBeats()
  return useAnimatedStyle(() => {
    const p = PRESETS.pulse
    return {
      opacity: sampleTrack(
        p.tracks.opacity,
        progress(beats.value, { name: 'pulse', period: 2 }),
        p.ease
      ),
    }
  })
}

const CARD = '0,0 100,0 100,93 50,100 0,93'

function Rig() {
  const H = useCanvasHeight()
  return (
    <>
      <Floodlight
        lamp={[20, 0, 28, 8]}
        beam={[
          [24, 8],
          [44, 8],
          [260, H - 84],
          [90, H - 84],
        ]}
        topOpacity={0.2}
        flick="flickSoft"
      />
      <Floodlight
        lamp={[342, 0, 28, 8]}
        beam={[
          [346, 8],
          [366, 8],
          [300, H - 84],
          [130, H - 84],
        ]}
        topOpacity={0.2}
        flick="flickSoft"
      />
      <SceneSvg>
        <Rect x={18} y={84} width={354} height={8} rx={4} fill={C.steel} />
        <Line x1={60} y1={0} x2={60} y2={84} stroke={C.steel} strokeWidth={2} />
        <Line
          x1={330}
          y1={0}
          x2={330}
          y2={84}
          stroke={C.steel}
          strokeWidth={2}
        />
      </SceneSvg>
    </>
  )
}

export function StoryOverlay({
  chapter,
  regionName,
  onClose,
}: {
  chapter: Chapter
  regionName: string
  onClose: () => void
}) {
  const sway = useSway()
  const pulse = usePulse()
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable
        accessibilityLabel="Close story"
        onPress={onClose}
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: 'rgba(11,11,13,0.88)' },
        ]}
      />
      <Rig />
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: 30,
            right: 30,
            top: 92,
            transformOrigin: 'top center',
          },
          sway,
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue"
          onPress={onClose}
        >
          <View style={{ paddingHorizontal: 3, paddingBottom: 3 }}>
            <FillPolygon points={CARD} fill={C.gold} />
            <View style={{ paddingBottom: 70 }}>
              <FillPolygon points={CARD} fill={C.iron} />
              <View style={{ height: 10, backgroundColor: C.crimson }} />
              <View style={{ paddingTop: 22, paddingHorizontal: 22, gap: 14 }}>
                <View style={{ alignSelf: 'flex-start' }}>
                  <Ribbon
                    label={`CHAPTER ${chapter.number}`}
                    size={15}
                    padX={26}
                    padTop={4}
                    ls={0.06}
                  />
                </View>
                <H size={38} lh={1} skewLeft>
                  {chapter.title}
                </H>
                <TapeTag label={regionName.toUpperCase()} />
                {chapter.paragraphs.map((p) => (
                  <T key={p} size={15} lh={1.6} color={C.parchment}>
                    {p}
                  </T>
                ))}
                <H size={20} lh={1.2} color={C.gold} skewLeft>
                  {chapter.tagline}
                </H>
                <Animated.View
                  style={[{ marginTop: 6, alignSelf: 'center' }, pulse]}
                >
                  <T f="body700" size={12} ls={0.2} color={C.mist}>
                    TAP TO CONTINUE
                  </T>
                </Animated.View>
              </View>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  )
}
