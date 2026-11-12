/**
 * The arena gate (docs/mockups/expedition.html): a brick wall, a glowing
 * archway to the region beyond, a portcullis that lifts on a 12-beat loop and
 * the hero jogging in place. Used behind YOUR CALL and the Map.
 */
import { View } from 'react-native'
import {
  ClipPath,
  Defs,
  G,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg'

import { C } from '../../theme/tokens'
import { FloorShapes, JogFigure } from './parts'
import { Scrim, SceneSvg } from './Screen'
import { Sprite } from './Sprite'
import { useSvgId } from './useSvgId'

const ARCH = 'M110 380V262a85 85 0 0 1 170 0V380z'
const BRICKS =
  'M0 196H390M0 226H390M0 256H390M0 286H390M0 316H390M0 346H390M30 166V196M90 166V196M150 166V196M240 166V196M300 166V196M360 166V196M60 196V226M330 196V226M30 226V256M360 226V256M60 256V286M330 256V286M30 286V316M360 286V316M60 316V346M330 316V346M30 346V380M360 346V380'
/** The arch's bounding rect with the arch cut out (even-odd). */
const ARCH_SURROUND = 'M110 177H280V380H110Z ' + ARCH

export function ArenaGate() {
  const regionId = useSvgId('region')
  const clipId = useSvgId('surround')
  const bars = [118, 140, 162, 184, 206, 228, 250, 272]
  const rails = [200, 240, 280, 320, 360]
  return (
    <>
      <SceneSvg>
        <Rect x={0} y={166} width={390} height={214} fill="#17181C" />
        <Path d={BRICKS} stroke={C.silhouette} strokeWidth={1.5} />
      </SceneSvg>
      <Sprite
        box={[110, 177, 170, 203]}
        anim={{ name: 'glow', period: 4 }}
        svg={
          <>
            <Defs>
              <RadialGradient id={regionId} cx="0.5" cy="0.7" r="0.7">
                <Stop offset="0" stopColor="#FF3A4F" />
                <Stop offset="0.45" stopColor={C.crimson} />
                <Stop offset="1" stopColor="#3A050C" />
              </RadialGradient>
            </Defs>
            <Path d={ARCH} fill={`url(#${regionId})`} />
          </>
        }
      />
      {/* portcullis: clipped to the arch's bounding rect, then the corners are re-covered below */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 110,
          top: 177,
          width: 170,
          height: 203,
          overflow: 'hidden',
        }}
      >
        <View style={{ position: 'absolute', left: -110, top: -177 }}>
          <Sprite
            box={[110, 172, 170, 212]}
            anim={{ name: 'gate', period: 12 }}
            svg={
              <G fill={C.steel}>
                {bars.map((x) => (
                  <Rect key={x} x={x} y={172} width={5} height={212} />
                ))}
                {rails.map((y) => (
                  <Rect key={y} x={110} y={y} width={170} height={5} />
                ))}
              </G>
            }
          />
        </View>
      </View>
      <SceneSvg>
        <Defs>
          <ClipPath id={clipId}>
            <Path d={ARCH_SURROUND} clipRule="evenodd" />
          </ClipPath>
        </Defs>
        <Path d={ARCH_SURROUND} fill="#17181C" fillRule="evenodd" />
        <Path
          d={BRICKS}
          stroke={C.silhouette}
          strokeWidth={1.5}
          clipPath={`url(#${clipId})`}
        />
        <Path
          d="M110 380V262a85 85 0 0 1 170 0V380"
          fill="none"
          stroke={C.steel}
          strokeWidth={10}
        />
        <FloorShapes y={380} />
      </SceneSvg>
      <JogFigure x={195} y={380} />
      <Scrim top={376} solidAt={0.1} />
    </>
  )
}
