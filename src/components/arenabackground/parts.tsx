/**
 * Arena scene parts shared by every screen background, ported from the SVG in
 * docs/mockups/*.html. Coordinates are mockup (design) pixels.
 */
import {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Polygon,
  Rect,
  Stop,
} from 'react-native-svg'

import type { AnimSpec, PresetName } from './keyframes'
import { Sprite } from './Sprite'
import { useSvgId } from './useSvgId'
import { C } from '../../theme/tokens'

type Pt = [number, number]

/** Class crest shield (110×120), from the class and hero mockups. */
export const SHIELD_PATH =
  'M55 4l46 16v34c0 32-20 52-46 62C29 106 9 86 9 54V20z'

function bbox(points: Pt[]): [number, number, number, number] {
  const xs = points.map((p) => p[0])
  const ys = points.map((p) => p[1])
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return [x, y, Math.max(...xs) - x, Math.max(...ys) - y]
}

/**
 * Floodlight: a lamp rect plus a trapezoid beam with a white→transparent
 * gradient. `swing` rotates both around the pivot; the beam flickers on the beat.
 */
export function Floodlight({
  lamp,
  beam,
  topOpacity,
  bottomOpacity = 0,
  swing,
  pivot,
  flick = 'flick',
  gradient = 'down',
}: {
  lamp: [number, number, number, number]
  beam: Pt[]
  topOpacity: number
  bottomOpacity?: number
  swing?: AnimSpec
  /** Defaults to the top-centre of the fill box (CSS transform-origin: 50% 0). */
  pivot?: Pt
  flick?: PresetName
  /** 'down' = top→bottom; 'diagL'/'diagR' = the workout screen's corner beams. */
  gradient?: 'down' | 'diagL' | 'diagR'
}) {
  const id = useSvgId('beam')
  const [lx, ly, lw, lh] = lamp
  const all: Pt[] = [...beam, [lx, ly], [lx + lw, ly + lh]]
  const box = bbox(all)
  const pv: Pt = pivot ?? [box[0] + box[2] / 2, box[1]]
  const beamBox = bbox(beam)
  const g =
    gradient === 'diagL'
      ? { x1: '0', y1: '0', x2: '1', y2: '1' }
      : gradient === 'diagR'
        ? { x1: '1', y1: '0', x2: '0', y2: '1' }
        : { x1: '0', y1: '0', x2: '0', y2: '1' }
  return (
    <Sprite box={box} pivot={pv} anim={swing}>
      <Sprite
        box={[lx, ly, lw, lh]}
        svg={
          <Rect x={lx} y={ly} width={lw} height={lh} rx={2} fill={C.steel} />
        }
      />
      <Sprite
        box={beamBox}
        anim={{ name: flick }}
        svg={
          <>
            <Defs>
              <LinearGradient id={id} {...g}>
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity={topOpacity} />
                <Stop
                  offset="1"
                  stopColor="#FFFFFF"
                  stopOpacity={bottomOpacity}
                />
              </LinearGradient>
            </Defs>
            <Polygon
              points={beam.map((p) => p.join(',')).join(' ')}
              fill={`url(#${id})`}
            />
          </>
        }
      />
    </Sprite>
  )
}

/** A row of crowd heads: a round-capped dashed line that bobs on the beat. */
export function CrowdRow({
  x1,
  x2,
  y,
  gap = 11,
  offset = 0,
}: {
  x1: number
  x2: number
  y: number
  gap?: number
  offset?: number
}) {
  return (
    <Sprite
      box={[x1 - 4, y - 7, x2 - x1 + 8, 14]}
      anim={{ name: 'bob', offset }}
      svg={
        <Line
          x1={x1}
          y1={y}
          x2={x2}
          y2={y}
          stroke={C.steel}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={`0 ${gap}`}
        />
      }
    />
  )
}

/** Static floor: deep strip, faint tile grid, crimson painted line. Use inside <SceneSvg>. */
export function FloorShapes({
  y,
  grid = true,
  gridRows = 2,
}: {
  y: number
  grid?: boolean
  gridRows?: number
}) {
  const rows = Array.from(
    { length: gridRows },
    (_, i) => `M0 ${y + 20 * (i + 1)}H390`
  ).join('')
  const bottom = y + 20 * gridRows + 10
  const cols = [40, 120, 200, 280, 360]
    .map((x) => `M${x} ${y}V${bottom}`)
    .join('')
  return (
    <G>
      <Rect x={0} y={y} width={390} height={2000} fill={C.floorDeep} />
      {grid ? (
        <Path
          d={rows + cols}
          stroke={C.steel}
          strokeOpacity={0.35}
          strokeWidth={1}
        />
      ) : null}
      <Rect x={0} y={y} width={390} height={3} fill={C.crimson} />
    </G>
  )
}

/** Chalk-dust puff (scale up, fade, drift up). */
export function Puff({
  cx,
  cy,
  r,
  period = 4,
  offset = 0,
}: {
  cx: number
  cy: number
  r: number
  period?: number
  offset?: number
}) {
  return (
    <Sprite
      box={[cx - r, cy - r, r * 2, r * 2]}
      anim={{ name: 'puff', period, offset }}
      svg={<Circle cx={cx} cy={cy} r={r} fill={C.chalk} />}
    />
  )
}

// ---------------------------------------------------------------- rep figures
// Each figure stands with its feet at (x, y), drawn as in the mockups.

const body = (fill: string) => (
  <>
    <Circle cx={0} cy={-46} r={6} fill={fill} />
    <Polygon points="-7,-38 7,-38 5,-18 -5,-18" fill={fill} />
  </>
)

/** Squat: legs fixed, torso/head/arms move down and up. */
export function SquatFigure({
  x,
  y,
  color = C.steel,
}: {
  x: number
  y: number
  color?: string
}) {
  return (
    <>
      <Sprite
        box={[x - 10, y - 20, 20, 22]}
        svg={
          <G transform={`translate(${x} ${y})`}>
            <Path
              d="M-3 -18 L-7 0 M3 -18 L7 0"
              fill="none"
              stroke={color}
              strokeWidth={4}
              strokeLinecap="round"
            />
          </G>
        }
      />
      <Sprite
        box={[x - 19, y - 53, 38, 40]}
        anim={{ name: 'squat' }}
        svg={
          <G transform={`translate(${x} ${y})`}>
            {body(color)}
            <Path
              d="M-7 -35 L-16 -30 M7 -35 L16 -30"
              fill="none"
              stroke={color}
              strokeWidth={4}
              strokeLinecap="round"
            />
          </G>
        }
      />
    </>
  )
}

function Limb({
  x,
  y,
  from,
  to,
  pivotAt,
  anim,
  color,
  w = 4,
}: {
  x: number
  y: number
  from: Pt
  to: Pt
  pivotAt: Pt
  anim: AnimSpec
  color: string
  w?: number
}) {
  const minX = Math.min(from[0], to[0]) - w
  const minY = Math.min(from[1], to[1]) - w
  const bw = Math.abs(from[0] - to[0]) + 2 * w
  const bh = Math.abs(from[1] - to[1]) + 2 * w
  return (
    <Sprite
      box={[x + minX, y + minY, bw, bh]}
      pivot={[x + pivotAt[0], y + pivotAt[1]]}
      anim={anim}
      svg={
        <G transform={`translate(${x} ${y})`}>
          <Line
            x1={from[0]}
            y1={from[1]}
            x2={to[0]}
            y2={to[1]}
            stroke={color}
            strokeWidth={w}
            strokeLinecap="round"
          />
        </G>
      }
    />
  )
}

/** Jumping jack: arms and legs rotate out, then in. */
export function JackFigure({
  x,
  y,
  color = C.crimson,
}: {
  x: number
  y: number
  color?: string
}) {
  return (
    <>
      <Sprite
        box={[x - 7, y - 52, 14, 34]}
        svg={<G transform={`translate(${x} ${y})`}>{body(color)}</G>}
      />
      <Limb
        x={x}
        y={y}
        from={[-6, -35]}
        to={[-12, -20]}
        pivotAt={[-6, -35]}
        anim={{ name: 'jackL' }}
        color={color}
      />
      <Limb
        x={x}
        y={y}
        from={[6, -35]}
        to={[12, -20]}
        pivotAt={[6, -35]}
        anim={{ name: 'jackR' }}
        color={color}
      />
      <Limb
        x={x}
        y={y}
        from={[-3, -18]}
        to={[-5, 0]}
        pivotAt={[-3, -18]}
        anim={{ name: 'legL' }}
        color={color}
      />
      <Limb
        x={x}
        y={y}
        from={[3, -18]}
        to={[5, 0]}
        pivotAt={[3, -18]}
        anim={{ name: 'legR' }}
        color={color}
      />
    </>
  )
}

/** Push-up: the horizontal body moves down and up; hands and feet stay planted. */
export function PushupFigure({
  x,
  y,
  color = C.steel,
}: {
  x: number
  y: number
  color?: string
}) {
  return (
    <>
      <Sprite
        box={[x - 36, y - 25, 66, 26]}
        anim={{ name: 'pushup' }}
        svg={
          <G transform={`translate(${x} ${y})`}>
            <Circle cx={-28} cy={-17} r={6} fill={color} />
            <Line
              x1={-20}
              y1={-14}
              x2={24}
              y2={-5}
              stroke={color}
              strokeWidth={7}
              strokeLinecap="round"
            />
          </G>
        }
      />
      <Sprite
        box={[x - 20, y - 15, 52, 18]}
        svg={
          <G
            transform={`translate(${x} ${y})`}
            stroke={color}
            strokeWidth={4}
            strokeLinecap="round"
          >
            <Line x1={-16} y1={-12} x2={-16} y2={0} />
            <Line x1={24} y1={-4} x2={28} y2={0} />
          </G>
        }
      />
    </>
  )
}

/** Plank hold: slow breathing scale. */
export function PlankFigure({
  x,
  y,
  color = C.steel,
  period = 2,
}: {
  x: number
  y: number
  color?: string
  period?: number
}) {
  return (
    <Sprite
      box={[x - 36, y - 20, 70, 22]}
      anim={{ name: 'breathe', period }}
      svg={
        <G
          transform={`translate(${x} ${y})`}
          stroke={color}
          strokeLinecap="round"
        >
          <Circle cx={-30} cy={-14} r={6} fill={color} stroke="none" />
          <Line x1={-22} y1={-11} x2={26} y2={-4} strokeWidth={7} />
          <Line x1={-20} y1={-9} x2={-30} y2={0} strokeWidth={4} />
          <Line x1={26} y1={-4} x2={30} y2={0} strokeWidth={4} />
        </G>
      }
    />
  )
}

/** Hero flexing on the class-select stage: arms rotate up and down. */
export function FlexFigure({
  x,
  y,
  color = C.crimson,
}: {
  x: number
  y: number
  color?: string
}) {
  return (
    <>
      <Sprite
        box={[x - 10, y - 53, 20, 55]}
        svg={
          <G transform={`translate(${x} ${y})`}>
            <Path
              d="M-3 -18 L-6 0 M3 -18 L6 0"
              fill="none"
              stroke={color}
              strokeWidth={4}
              strokeLinecap="round"
            />
            {body(color)}
          </G>
        }
      />
      <Limb
        x={x}
        y={y}
        from={[-6, -35]}
        to={[-12, -22]}
        pivotAt={[-6, -35]}
        anim={{ name: 'flexL', period: 2 }}
        color={color}
      />
      <Limb
        x={x}
        y={y}
        from={[6, -35]}
        to={[12, -22]}
        pivotAt={[6, -35]}
        anim={{ name: 'flexR', period: 2 }}
        color={color}
      />
    </>
  )
}

/** Jogging hero (expedition gate): body bounces, limbs stride. */
export function JogFigure({
  x,
  y,
  color = C.chalk,
}: {
  x: number
  y: number
  color?: string
}) {
  const limb = (fx: number, y1: number, y2: number, offset: number) => (
    <Limb
      x={x}
      y={y}
      from={[fx, y1]}
      to={[fx, y2]}
      pivotAt={[fx, y1]}
      anim={{ name: 'stride', period: 2, offset }}
      color={color}
    />
  )
  return (
    <Sprite box={[x - 20, y - 56, 40, 60]} anim={{ name: 'jog' }}>
      {limb(-2, -18, 0, 0)}
      {limb(2, -18, 0, 1)}
      <Sprite
        box={[x - 7, y - 52, 14, 34]}
        svg={<G transform={`translate(${x} ${y})`}>{body(color)}</G>}
      />
      {limb(-6, -35, -22, 1)}
      {limb(6, -35, -22, 0)}
    </Sprite>
  )
}
