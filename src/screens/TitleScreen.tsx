/** Title screen — docs/mockups/title.html (main stage, 100 BPM). */
import { useNav } from '../navigation/useNav'
import { useHero } from '../state/useHero'
import { View } from 'react-native'
import { Circle, G, Path, Rect } from 'react-native-svg'

import { GoldButton, H, IconButton, Ribbon } from '../components/ui'
import { Scrim, SceneSvg, Screen } from '../components/arenabackground/Screen'
import {
  CrowdRow,
  FloorShapes,
  Floodlight,
  Puff,
  PushupFigure,
  JackFigure,
  SquatFigure,
} from '../components/arenabackground/parts'
import { C } from '../theme/tokens'

function Logo() {
  const line = (color: string, dx: number) => (
    <H
      size={84}
      lh={0.88}
      align="center"
      skew
      color={color}
      style={
        dx ? { position: 'absolute', left: dx, top: dx, right: -dx } : undefined
      }
    >
      {'REP\nRAIDERS'}
    </H>
  )
  return (
    <View>
      {line('rgba(0,0,0,0.5)', 8)}
      {line(C.crimson, 4)}
      {line(C.chalk, 0)}
    </View>
  )
}

export default function Title() {
  const nav = useNav()
  const hasClass = useHero((s) => s.classId !== null)
  return (
    <Screen
      bpm={100}
      glow={{ cx: 0.5, cy: 0.25, rx: 0.8, ry: 0.35, opacity: 0.3 }}
    >
      <Floodlight
        lamp={[46, 0, 28, 8]}
        beam={[
          [50, 8],
          [70, 8],
          [140, 520],
          [-20, 520],
        ]}
        topOpacity={0.24}
        swing={{ name: 'swing', period: 8 }}
      />
      <Floodlight
        lamp={[181, 0, 28, 8]}
        beam={[
          [185, 8],
          [205, 8],
          [275, 520],
          [115, 520],
        ]}
        topOpacity={0.24}
        swing={{ name: 'swing', period: 8, offset: 2 }}
      />
      <Floodlight
        lamp={[316, 0, 28, 8]}
        beam={[
          [320, 8],
          [340, 8],
          [410, 520],
          [250, 520],
        ]}
        topOpacity={0.24}
        swing={{ name: 'swing', period: 8, reverse: true }}
      />
      <SceneSvg>
        <Rect x={0} y={330} width={390} height={20} fill="#17181C" />
        <Rect x={0} y={350} width={390} height={20} fill="#1A1B20" />
        <Rect x={0} y={370} width={390} height={20} fill="#1D1E23" />
      </SceneSvg>
      <CrowdRow x1={8} x2={384} y={326} />
      <CrowdRow x1={3} x2={388} y={346} offset={0.5} />
      <CrowdRow x1={8} x2={384} y={366} />
      <SceneSvg>
        <G fill={C.silhouette}>
          <Rect x={14} y={420} width={6} height={100} />
          <Rect x={78} y={420} width={6} height={100} />
          <Rect x={0} y={446} width={98} height={5} rx={2} />
          <Circle cx={6} cy={448} r={17} />
          <Circle cx={92} cy={448} r={17} />
          <Rect x={296} y={486} width={88} height={5} />
          <Rect x={298} y={486} width={5} height={34} />
          <Rect x={377} y={486} width={5} height={34} />
          {[310, 322, 340, 352, 368].map((cx) => (
            <Circle key={cx} cx={cx} cy={479} r={6} />
          ))}
          <Circle cx={104} cy={511} r={9} />
          <Path
            d="M98 506a6 6 0 0 1 12 0"
            fill="none"
            stroke={C.silhouette}
            strokeWidth={3}
          />
        </G>
        <FloorShapes y={520} />
      </SceneSvg>
      <SquatFigure x={146} y={520} />
      <JackFigure x={206} y={520} />
      <PushupFigure x={262} y={520} />
      <Puff cx={136} cy={516} r={3} />
      <Puff cx={206} cy={515} r={3} offset={2} />
      <Puff cx={248} cy={516} r={2.5} offset={1} />
      <Puff cx={60} cy={516} r={2.5} offset={3} />
      <Scrim top={540} solidAt={0.2} />

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          alignItems: 'center',
        }}
      >
        <View style={{ marginTop: 120 }}>
          <Logo />
        </View>
        <View style={{ marginTop: 22 }}>
          <Ribbon
            label="EVERY REP POWERS YOUR RAID"
            font="body800"
            size={12}
            ls={0.14}
            padX={30}
            padTop={6}
            padBottom={5}
            notch={6}
          />
        </View>
        {/* PLAY is the only way in: new players choose a class first */}
        <View style={{ marginTop: 290, width: 300 }}>
          <GoldButton
            label="PLAY"
            height={62}
            fontSize={28}
            ls={0.06}
            trackWidth={300}
            stripeOpacity={0.4}
            onPress={() => nav.navigate(hasClass ? 'Camp' : 'ClassSelect')}
          />
        </View>
        <View style={{ marginTop: 40, flexDirection: 'row', gap: 14 }}>
          <IconButton
            icon="settings"
            label="Settings"
            size={52}
            iconSize={22}
            radius={12}
            onPress={() => nav.navigate('Settings')}
          />
          <IconButton
            icon="trophy"
            label="Trophies"
            size={52}
            iconSize={22}
            radius={12}
            color={C.gold}
          />
          <IconButton
            icon="help"
            label="Guide"
            size={52}
            iconSize={22}
            radius={12}
          />
        </View>
      </View>
    </Screen>
  )
}
