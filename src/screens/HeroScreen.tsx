/** Hero sheet — docs/mockups/hero.html (trophy wall, 70 BPM). */
import { CLASSES, type ClassId } from '../../rpg/classes'
import { STARTING_REGION } from '../../rpg/world'
import { goTab, useNav } from '../navigation/useNav'
import { Pressable, View } from 'react-native'
import { Circle, G, Path, Rect } from 'react-native-svg'

import { Icon, type IconName } from '../components/ui/Icon'
import { Scrim, SceneSvg, Screen } from '../components/arenabackground/Screen'
import { TabNav } from '../components/ui/TabNav'
import {
  Card,
  H,
  Header,
  HeaderTitle,
  BarbellBar,
  GoldButton,
  Panel,
  PlateRing,
  Ribbon,
  StatRow,
  T,
} from '../components/ui'
import {
  FloorShapes,
  Floodlight,
  PlankFigure,
  SHIELD_PATH,
} from '../components/arenabackground/parts'
import {
  levelInfo,
  levelTitle,
  mastery,
  questsCompleted,
} from '../../rpg/progress'
import { useHero } from '../state/useHero'
import { C, type StatKey } from '../theme/tokens'

const SWORDS = [
  'M14.5 17.5 3 6V3h3l11.5 11.5',
  'm13 19 6-6M16 16l4 4M19 21l2-2',
  'M14.5 6.5 18 3h3v3l-3.5 3.5',
  'm5 14 4 4M7 17l-3 3M3 19l2 2',
]
const BOW = ['M5 19 19 5M13 5h6v6', 'M5 5c8 0 14 6 14 14', 'M3 21l3-1-2-2z']

function TrophyWall({ classId }: { classId: ClassId }) {
  return (
    <>
      <SceneSvg>
        <Rect x={181} y={104} width={28} height={7} rx={2} fill={C.steel} />
      </SceneSvg>
      <Floodlight
        lamp={[181, 104, 0, 0]}
        beam={[
          [185, 111],
          [205, 111],
          [285, 300],
          [105, 300],
        ]}
        topOpacity={0.26}
        flick="flickSoft"
      />
      <SceneSvg>
        <G fill={C.silhouette}>
          <Rect x={10} y={166} width={104} height={5} />
          <Rect x={10} y={226} width={104} height={5} />
          <Rect x={276} y={166} width={104} height={5} />
          <Rect x={276} y={226} width={104} height={5} />
          <Rect x={24} y={158} width={18} height={8} />
          <Path d="M22 136h22l-3 14h-16z" />
          <Rect x={30} y={150} width={6} height={8} />
          <Rect x={64} y={160} width={14} height={6} />
          <Circle cx={71} cy={148} r={8} />
          <Rect x={68} y={154} width={6} height={6} />
          <Rect x={88} y={156} width={18} height={10} />
          <Path d="M86 128h22l-4 20h-14z" />
          <Rect x={94} y={148} width={6} height={8} />
          <Rect x={22} y={218} width={22} height={8} />
          <Path d="M24 196h18l-3 16h-12z" />
          <Rect x={30} y={212} width={6} height={6} />
          <Rect x={62} y={220} width={16} height={6} />
          <Circle cx={70} cy={208} r={9} />
          <Rect x={286} y={158} width={18} height={8} />
          <Circle cx={295} cy={146} r={9} />
          <Rect x={318} y={156} width={20} height={10} />
          <Path d="M316 130h24l-4 20h-16z" />
          <Rect x={325} y={150} width={6} height={6} />
          <Rect x={352} y={160} width={16} height={6} />
          <Path d="M350 140h20l-3 14h-14z" />
          <Rect x={290} y={218} width={22} height={8} />
          <Path d="M292 194h18l-3 18h-12z" />
          <Rect x={298} y={212} width={6} height={6} />
          <Rect x={336} y={220} width={16} height={6} />
          <Circle cx={344} cy={208} r={9} />
        </G>
        <Path d="M346 136h24l-4 18h-16z" fill={C.gold} fillOpacity={0.55} />
        <FloorShapes y={300} />
        <G transform="translate(140 118)">
          <Path
            d={SHIELD_PATH}
            fill={C.crimson}
            stroke={C.gold}
            strokeWidth={4}
            strokeLinejoin="round"
          />
          <G
            transform="translate(31 30) scale(2)"
            fill="none"
            stroke={C.chalk}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {(classId === 'archer' ? BOW : SWORDS).map((d) => (
              <Path key={d} d={d} />
            ))}
          </G>
        </G>
      </SceneSvg>
      <PlankFigure x={320} y={300} color={C.crimson} />
      <Scrim top={296} solidAt={0.12} />
    </>
  )
}

const STORY_START = STARTING_REGION.chapterId

const ABILITY_ICON: IconName[] = ['shield', 'swap', 'flame']

export default function Hero() {
  const nav = useNav()
  const stats = useHero((s) => s.stats)
  const classId = useHero((s) => s.classId) ?? 'warrior'
  const m = mastery(useHero(questsCompleted))
  const cls = CLASSES[classId]
  const lv = levelInfo(stats)
  const level = lv.level
  // New heroes head to the Map next, where Chapter 1 opens
  const firstRun = useHero((s) => !s.seenChapters.includes(STORY_START))
  // Bars fill against the next 10 above the best stat (never below 40)
  const barMax = Math.max(
    40,
    Math.ceil((Math.max(...Object.values(stats)) + 1) / 10) * 10
  )
  return (
    <Screen
      bpm={70}
      glow={{ cx: 0.5, cy: 0.25, rx: 0.8, ry: 0.4, opacity: 0.22 }}
    >
      <TrophyWall classId={cls.id} />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 236,
          alignItems: 'center',
        }}
      >
        <Ribbon label={cls.name} />
      </View>

      <Header>
        <HeaderTitle>HERO</HeaderTitle>
        <Pressable
          accessibilityRole="link"
          onPress={() => nav.navigate('ClassSelect')}
          style={{
            height: 40,
            paddingHorizontal: 14,
            borderRadius: 10,
            borderWidth: 1.5,
            borderColor: C.steel,
            backgroundColor: C.floor,
            justifyContent: 'center',
          }}
        >
          <T f="body700" size={12} ls={0.08}>
            CHANGE CLASS
          </T>
        </Pressable>
      </Header>

      <View
        style={{ position: 'absolute', left: 16, right: 16, top: 314, gap: 10 }}
      >
        <Panel
          label={`CLASS LEVEL ${level} · ${levelTitle(level)}`}
          right={`${lv.toNext} pts to level ${level + 1}`}
        >
          <View
            style={{
              paddingTop: 10,
              paddingHorizontal: 14,
              paddingBottom: 12,
              gap: 6,
            }}
          >
            {(['STR', 'END', 'AGI', 'VIT'] as StatKey[]).map((s) => (
              <StatRow
                key={s}
                stat={s}
                value={stats[s]}
                fraction={stats[s] / barMax}
              />
            ))}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                marginTop: 4,
              }}
            >
              <T f="body700" size={11} ls={0.1} style={{ width: 34 }}>
                LV {level}
              </T>
              <BarbellBar
                big={false}
                segments={[[lv.into / lv.cost, C.gold]]}
              />
              <T f="body600" size={11} color={C.mist}>
                Expeditions up to level {level}
              </T>
            </View>
          </View>
        </Panel>

        {firstRun ? (
          <Card featured style={{ gap: 10 }}>
            <T size={13} color={C.mist}>
              Your hero is ready. Head into the world to set up camp and start
              your first chapter.
            </T>
            <GoldButton
              label="ENTER THE WORLD"
              icon="map"
              height={50}
              fontSize={19}
              trackWidth={340}
              onPress={() => goTab(nav, 'Map')}
            />
          </Card>
        ) : (
          <Card
            featured
            style={{
              paddingVertical: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <PlateRing
              size={56}
              fraction={m.progress}
              label={`${m.rank}`}
              labelColor={C.gold}
              labelSize={22}
              labelY={37}
            />
            <View style={{ flex: 1, gap: 2 }}>
              <H size={17} skewLeft>
                {cls.name} MASTERY
              </H>
              <T size={13} color={C.mist}>
                Rank {m.rank} · keep training to rank up
              </T>
            </View>
            <Icon name="trophy" size={22} color={C.gold} />
          </Card>
        )}

        {firstRun ? null : (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {cls.abilities.map((a, i) => (
              <View
                key={a}
                style={{
                  // size to the label so long names (Special Arrow) never wrap
                  flexGrow: 1,
                  paddingHorizontal: 10,
                  height: 44,
                  borderRadius: 10,
                  backgroundColor: C.iron,
                  borderWidth: 1,
                  borderColor: C.steel,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Icon
                  name={ABILITY_ICON[i] ?? 'shield'}
                  size={15}
                  color={C.gold}
                />
                <T f="body600" size={13} numberOfLines={1}>
                  {a}
                </T>
              </View>
            ))}
          </View>
        )}
      </View>

      <TabNav active="hero" />
    </Screen>
  )
}
