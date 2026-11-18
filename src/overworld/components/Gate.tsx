// A locked region gate on the map: two stone pillars, an iron portcullis and
// a gold padlock (drawn in code; no image files). Opened with gold later
// (build-order step 5).
import { View } from 'react-native'
import Svg, { Circle, G, Path, Rect } from 'react-native-svg'

import { TILE, type Rect as TileRect } from '../mapTypes'

const STONE = '#6E6A72'
const STONE_DARK = '#4A464E'
const IRON = '#2A2C33'
const GOLD = '#F2B233'

/** `area` is the gate in tiles; the art stands a tile taller than it. */
export function Gate({
  area,
  scale,
  zIndex,
}: {
  area: TileRect
  scale: number
  zIndex: number
}) {
  const w = area.width * TILE
  const h = (area.height + 1) * TILE
  const pillar = 22
  const bars = 7
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: area.x * TILE * scale,
        top: (area.y - 1) * TILE * scale,
        width: w * scale,
        height: h * scale,
        zIndex,
      }}
    >
      <Svg width={w * scale} height={h * scale} viewBox={`0 0 ${w} ${h}`}>
        {/* Ground shadow */}
        <Rect x={4} y={h - 8} width={w - 8} height={8} fill="rgba(0,0,0,0.3)" />
        {/* Portcullis */}
        <G>
          <Rect
            x={pillar}
            y={22}
            width={w - 2 * pillar}
            height={h - 26}
            fill="rgba(11,11,13,0.55)"
          />
          {Array.from({ length: bars }, (_, i) => {
            const x = pillar + ((w - 2 * pillar) / (bars + 1)) * (i + 1)
            return (
              <Rect
                key={i}
                x={x - 2}
                y={20}
                width={4}
                height={h - 24}
                fill={IRON}
              />
            )
          })}
          <Rect
            x={pillar}
            y={h * 0.45}
            width={w - 2 * pillar}
            height={4}
            fill={IRON}
          />
        </G>
        {/* Lintel */}
        <Rect x={0} y={6} width={w} height={18} rx={3} fill={STONE} />
        <Rect x={0} y={20} width={w} height={4} fill={STONE_DARK} />
        {/* Pillars */}
        {[0, w - pillar].map((x) => (
          <G key={x}>
            <Rect
              x={x}
              y={0}
              width={pillar}
              height={h - 4}
              rx={2}
              fill={STONE}
            />
            <Rect
              x={x}
              y={h - 14}
              width={pillar}
              height={10}
              fill={STONE_DARK}
            />
            <Path
              d={`M${x + 4} 30 h${pillar - 8} M${x + 4} 54 h${pillar - 8}`}
              stroke={STONE_DARK}
              strokeWidth={2}
            />
          </G>
        ))}
        {/* Padlock */}
        <G transform={`translate(${w / 2} ${h * 0.55})`}>
          <Path
            d="M-6 -4 v-5 a6 6 0 0 1 12 0 v5"
            fill="none"
            stroke={GOLD}
            strokeWidth={3}
          />
          <Rect x={-9} y={-4} width={18} height={14} rx={2} fill={GOLD} />
          <Circle cx={0} cy={3} r={2.2} fill={IRON} />
        </G>
      </Svg>
    </View>
  )
}
