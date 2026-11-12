/**
 * Screen: a 390-wide design canvas scaled to the device width, with the arena
 * wall gradient and crimson glow, wrapped in a BeatProvider at the screen's BPM.
 * Every child uses mockup pixel coordinates.
 */
import { createContext, useContext, useState, type ReactNode } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg'

import { BeatProvider } from './beat'
import { useSvgId } from './useSvgId'
import { C, DESIGN_H, DESIGN_W } from '../../theme/tokens'

type Glow = { cx: number; cy: number; rx: number; ry: number; opacity: number }

const CanvasHeight = createContext(DESIGN_H)
/** Height of the canvas in design units (taller phones get a taller canvas). */
export const useCanvasHeight = () => useContext(CanvasHeight)

/**
 * Scale for a container of the given size. Phones fill the width; wide
 * screens (tablets) show a phone-sized column.
 */
export function designScale(width: number, height: number) {
  const s =
    width <= 500
      ? width / DESIGN_W
      : Math.min(width / DESIGN_W, height / DESIGN_H, 1.2)
  return { s, width, height, canvasH: height / s }
}

/**
 * The screen's real size. Window dimensions leave out the system bars on
 * Android while the app draws edge to edge, so measure the container itself
 * (window size is only the first-frame guess).
 */
function useContainerSize() {
  const win = useWindowDimensions()
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null
  )
  const onLayout = (e: {
    nativeEvent: { layout: { width: number; height: number } }
  }) => {
    const { width, height } = e.nativeEvent.layout
    if (!size || size.width !== width || size.height !== height)
      setSize({ width, height })
  }
  return { ...(size ?? win), onLayout }
}

export function Screen({
  bpm,
  glow,
  children,
}: {
  bpm: number
  glow?: Glow
  children: ReactNode
}) {
  const { width, height, onLayout } = useContainerSize()
  const { s, canvasH } = designScale(width, height)
  const wallId = useSvgId('wall')
  const glowId = useSvgId('glow')
  const H = Math.max(canvasH, DESIGN_H * 0.8)
  return (
    <View style={styles.root} onLayout={onLayout}>
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: (width - DESIGN_W * s) / 2,
          width: DESIGN_W,
          height: H,
          overflow: 'hidden',
          transform: [{ scale: s }],
          transformOrigin: '0px 0px',
        }}
      >
        <BeatProvider bpm={bpm}>
          <CanvasHeight.Provider value={H}>
            <Svg width={DESIGN_W} height={H} style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id={wallId} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={C.floor} />
                  <Stop offset="1" stopColor={C.wallBottom} />
                </LinearGradient>
                {glow ? (
                  <RadialGradient
                    id={glowId}
                    gradientUnits="userSpaceOnUse"
                    cx={glow.cx * DESIGN_W}
                    cy={glow.cy * DESIGN_H}
                    rx={glow.rx * DESIGN_W}
                    ry={glow.ry * DESIGN_H}
                    fx={glow.cx * DESIGN_W}
                    fy={glow.cy * DESIGN_H}
                  >
                    <Stop
                      offset="0"
                      stopColor={C.crimson}
                      stopOpacity={glow.opacity}
                    />
                    <Stop offset="0.7" stopColor={C.crimson} stopOpacity={0} />
                  </RadialGradient>
                ) : null}
              </Defs>
              <Rect
                x={0}
                y={0}
                width={DESIGN_W}
                height={H}
                fill={`url(#${wallId})`}
              />
              {glow ? (
                <Rect
                  x={0}
                  y={0}
                  width={DESIGN_W}
                  height={H}
                  fill={`url(#${glowId})`}
                />
              ) : null}
            </Svg>
            {children}
          </CanvasHeight.Provider>
        </BeatProvider>
      </View>
    </View>
  )
}

/** Full-canvas static SVG layer in design coordinates. */
export function SceneSvg({ children }: { children: ReactNode }) {
  const H = useCanvasHeight()
  return (
    <Svg
      width={DESIGN_W}
      height={H}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      {children}
    </Svg>
  )
}

/** The dark scrim that keeps cards readable over the scene. */
export function Scrim({ top, solidAt }: { top: number; solidAt: number }) {
  const H = useCanvasHeight()
  const id = useSvgId('scrim')
  return (
    <Svg
      width={DESIGN_W}
      height={H - top}
      style={{ position: 'absolute', left: 0, top }}
      pointerEvents="none"
    >
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={C.floor} stopOpacity={0} />
          <Stop
            offset={String(solidAt)}
            stopColor={C.floor}
            stopOpacity={0.85}
          />
          <Stop offset="1" stopColor={C.floor} stopOpacity={0.85} />
        </LinearGradient>
      </Defs>
      <Rect
        x={0}
        y={0}
        width={DESIGN_W}
        height={H - top}
        fill={`url(#${id})`}
      />
    </Svg>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.floorDeep,
    overflow: 'hidden',
  },
})
