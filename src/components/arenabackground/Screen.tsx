/**
 * Screen: the mockups' 390-wide design canvas, with the arena wall gradient
 * and crimson glow, wrapped in a BeatProvider at the screen's BPM. Every child
 * uses mockup pixel coordinates.
 *
 * Portrait: one canvas scaled to the device width. The scene and header fill
 * it, the <ScreenBody> child sits below `split`, and the tab bar is at the
 * bottom.
 *
 * Landscape (the orientation setting): two columns on a LAND_H-tall canvas.
 * The left column shows the portrait scene from y = 0 down to `sceneH` (scaled
 * to fit). The right column holds the <ScreenBody>, with a compact tab bar
 * beneath it. Screens without a body fall back to one centred column.
 */
import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg'

import { BeatProvider } from './beat'
import {
  designScale,
  LAND_H,
  landscapeLayout,
  TAB_H,
  TAB_H_LAND,
} from './layout'
import { useSvgId } from './useSvgId'
import { TabNav, type TabKey } from '../ui/TabNav'
import { C, DESIGN_H, DESIGN_W } from '../../theme/tokens'

type Glow = { cx: number; cy: number; rx: number; ry: number; opacity: number }

/** Room a full-screen overlay (story card) needs in landscape. */
const OVERLAY_H = 780

export { designScale, LAND_H, landscapeLayout } from './layout'

const CanvasWidth = createContext(DESIGN_W)
/** Width of the canvas in design units (wider for a landscape `sceneW`). */
export const useCanvasWidth = () => useContext(CanvasWidth)

const CanvasHeight = createContext(DESIGN_H)
/** Height of the canvas in design units (taller phones get a taller canvas). */
export const useCanvasHeight = () => useContext(CanvasHeight)

/** True when the window is wider than tall. */
export function useLandscape() {
  const { width, height } = useWindowDimensions()
  return width > height
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
  // A rotation changes the window before the next layout arrives
  const stale = size && size.width > size.height !== win.width > win.height
  return { ...(size && !stale ? size : win), onLayout }
}

/** Wall gradient and optional glow, `w` × `h` design units. */
function Backdrop({ w, h, glow }: { w: number; h: number; glow?: Glow }) {
  const wallId = useSvgId('wall')
  const glowId = useSvgId('glow')
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
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
            <Stop offset="0" stopColor={C.crimson} stopOpacity={glow.opacity} />
            <Stop offset="0.7" stopColor={C.crimson} stopOpacity={0} />
          </RadialGradient>
        ) : null}
      </Defs>
      <Rect x={0} y={0} width={w} height={h} fill={`url(#${wallId})`} />
      {glow ? (
        <Rect x={0} y={0} width={w} height={h} fill={`url(#${glowId})`} />
      ) : null}
    </Svg>
  )
}

type BodyProps = {
  /** contentContainerStyle (or the view's style when not scrolling). */
  style?: StyleProp<ViewStyle>
  /** Scroll (default) or a plain view. */
  scroll?: boolean
  children?: ReactNode
}

/**
 * Marks a Screen's content below the scene. Must be a direct child of
 * <Screen>; Screen places it (below `split` in portrait, the right column in
 * landscape).
 */
export function ScreenBody(_: BodyProps): null {
  return null
}

function splitChildren(children: ReactNode) {
  let body: BodyProps | undefined
  const scene: ReactNode[] = []
  Children.forEach(children, (c) => {
    if (isValidElement(c) && c.type === ScreenBody)
      body = (c as ReactElement<BodyProps>).props
    else scene.push(c)
  })
  return { body, scene }
}

function Body({
  children,
  style,
  scroll = true,
  box,
}: BodyProps & { box: ViewStyle }) {
  return scroll ? (
    <ScrollView
      style={box}
      contentContainerStyle={style}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[box, style]}>{children}</View>
  )
}

export function Screen({
  bpm,
  glow,
  children,
  split = 0,
  sceneH,
  sceneW = DESIGN_W,
  tab,
  overlay,
}: {
  bpm: number
  glow?: Glow
  /** Scene layers and header in portrait design coordinates, and optionally
   * one <ScreenBody>. */
  children?: ReactNode
  /** Portrait y where the body starts. */
  split?: number
  /** How much of the scene the landscape column shows (default: `split`). */
  sceneH?: number
  /** Landscape: design width of the scene column (default 390). Scene
   * layers read it from useCanvasWidth. */
  sceneW?: number
  tab?: TabKey
  /** Full-screen layer above everything (e.g. the story card). */
  overlay?: ReactNode
}) {
  const { width, height, onLayout } = useContainerSize()
  const insets = useSafeAreaInsets()
  const { body: bodyProps, scene } = splitChildren(children)
  const landscape = width > height && bodyProps !== undefined

  if (landscape) {
    const tabH = tab ? TAB_H_LAND : 0
    const L = landscapeLayout(width, height, {
      sceneH: sceneH ?? split,
      sceneW,
      insets,
      tabH,
    })
    return (
      <View style={styles.root} onLayout={onLayout}>
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: L.canvasW,
            height: LAND_H,
            transform: [{ scale: L.s }],
            transformOrigin: '0px 0px',
          }}
        >
          <BeatProvider bpm={bpm}>
            <Backdrop w={L.canvasW} h={LAND_H} />
            <View
              style={{
                position: 'absolute',
                left: L.sceneLeft,
                top: 0,
                width: L.sceneW,
                height: L.colH,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: sceneW,
                  height: L.regionH,
                  transform: [{ scale: L.k }],
                  transformOrigin: '0px 0px',
                }}
              >
                <CanvasWidth.Provider value={sceneW}>
                  <CanvasHeight.Provider value={L.regionH}>
                    <Backdrop w={sceneW} h={L.regionH} glow={glow} />
                    {scene}
                  </CanvasHeight.Provider>
                </CanvasWidth.Provider>
              </View>
            </View>
            <View
              style={{
                position: 'absolute',
                left: L.bodyLeft,
                width: L.bodyW,
                top: 0,
                height: L.colH,
                borderLeftWidth: 1,
                borderLeftColor: C.steel,
                backgroundColor: 'rgba(17,17,20,0.6)',
              }}
            >
              <CanvasHeight.Provider value={L.colH}>
                <Body {...bodyProps!} box={{ flex: 1 }} />
              </CanvasHeight.Provider>
            </View>
            {tab ? (
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  width: L.canvasW,
                  top: L.colH,
                  height: tabH,
                  paddingLeft: L.sceneLeft,
                  paddingRight: L.right,
                  backgroundColor: C.floor,
                }}
              >
                <TabNav active={tab} compact />
              </View>
            ) : null}
            {overlay ? (
              <View style={StyleSheet.absoluteFill}>
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    { backgroundColor: 'rgba(11,11,13,0.88)' },
                  ]}
                />
                <ScrollView
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    width: DESIGN_W,
                    left: (L.canvasW - DESIGN_W) / 2,
                  }}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={{ width: DESIGN_W, height: OVERLAY_H }}>
                    <CanvasHeight.Provider value={OVERLAY_H}>
                      {overlay}
                    </CanvasHeight.Provider>
                  </View>
                </ScrollView>
              </View>
            ) : null}
          </BeatProvider>
        </View>
      </View>
    )
  }

  const { s, canvasH } = designScale(width, height)
  const H = Math.max(canvasH, DESIGN_H * 0.8)
  const tabH = tab ? TAB_H : 0
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
            <Backdrop w={DESIGN_W} h={H} glow={glow} />
            {scene}
            {bodyProps ? (
              <Body
                {...bodyProps}
                box={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: split,
                  bottom: tabH,
                }}
              />
            ) : null}
            {tab ? (
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: H - TAB_H,
                  height: TAB_H,
                }}
              >
                <TabNav active={tab} />
              </View>
            ) : null}
            {overlay}
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
