/** Daily quests — docs/mockups/quests.html (training floor, 100 BPM). */
import { useNav } from '../navigation/useNav'
import { Pressable, ScrollView, View } from 'react-native'
import { Circle, G, Rect } from 'react-native-svg'

import { Icon } from '../components/ui/Icon'
import { Scrim, SceneSvg, Screen } from '../components/arenabackground/Screen'
import { TabNav } from '../components/ui/TabNav'
import {
  BarbellBar,
  Card,
  CrimsonButton,
  GoldButton,
  H,
  Header,
  HeaderTitle,
  N,
  Panel,
  T,
  TapeTag,
} from '../components/ui'
import {
  FloorShapes,
  Floodlight,
  PlankFigure,
  Puff,
  PushupFigure,
  SquatFigure,
} from '../components/arenabackground/parts'
import { arrivedQuests, canAddAdQuest, nextQuest } from '../../rpg/progress'
import { MAX_AD_QUESTS } from '../../rpg/quests'
import {
  useHero,
  useMinuteOfDay,
  useTodayQuests,
  type QuestView,
} from '../state/useHero'
import { setsLabel } from '../utils/format'
import {
  C,
  STAT_COLOR,
  STAT_ORDER,
  STAT_TEXT,
  type StatKey,
} from '../theme/tokens'

function TrainingFloor() {
  return (
    <>
      <Floodlight
        lamp={[96, 104, 28, 7]}
        beam={[
          [100, 111],
          [120, 111],
          [175, 236],
          [45, 236],
        ]}
        topOpacity={0.22}
        swing={{ name: 'swing', period: 8 }}
      />
      <Floodlight
        lamp={[266, 104, 28, 7]}
        beam={[
          [270, 111],
          [290, 111],
          [345, 236],
          [215, 236],
        ]}
        topOpacity={0.22}
        swing={{ name: 'swing', period: 8, reverse: true }}
      />
      <SceneSvg>
        <G fill={C.silhouette}>
          <Rect x={128} y={146} width={5} height={90} />
          <Rect x={257} y={146} width={5} height={90} />
          <Rect x={122} y={146} width={146} height={5} rx={2} />
          <Rect x={16} y={196} width={6} height={40} />
          <Rect x={60} y={196} width={6} height={40} />
          <Rect x={4} y={198} width={74} height={4} rx={2} />
          <Circle cx={8} cy={200} r={13} />
          <Circle cx={74} cy={200} r={13} />
        </G>
        <FloorShapes y={236} />
      </SceneSvg>
      <PushupFigure x={78} y={236} />
      <SquatFigure x={195} y={236} color={C.crimson} />
      <PlankFigure x={318} y={236} />
      <Puff cx={64} cy={232} r={3} />
      <Puff cx={186} cy={232} r={3} offset={2} />
      <Puff cx={206} cy={233} r={2.5} offset={2} />
      <Puff cx={300} cy={232} r={2.5} offset={3} />
      <Scrim top={230} solidAt={0.14} />
    </>
  )
}

function SwapButton({
  label,
  hint,
  onPress,
  disabled,
}: {
  label: 'Easier' | 'Harder'
  hint: string
  onPress?: () => void
  disabled?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        height: 48,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: label === 'Harder' ? C.gold : C.steel,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        opacity: disabled ? 0.35 : pressed ? 0.7 : 1,
      })}
    >
      <Icon
        name="swap"
        size={15}
        color={label === 'Harder' ? C.gold : C.chalk}
      />
      <T f="body700" size={13} color={label === 'Harder' ? C.gold : C.chalk}>
        {label}
      </T>
    </Pressable>
  )
}

/** "1H 05M" until a minute of the day. */
function untilLabel(target: number, now: number) {
  const m = Math.max(0, target - now)
  return `${Math.floor(m / 60)}H ${String(m % 60).padStart(2, '0')}M`
}

function Reward({
  amount,
  stat,
  size = 26,
}: {
  amount: number
  stat: StatKey
  size?: number
}) {
  return (
    <N size={size} lh={1}>
      +{amount}{' '}
      <N size={size} color={STAT_TEXT[stat]}>
        {stat}
      </N>
    </N>
  )
}

const trackLabel = (v: QuestView) =>
  v.quest.track === 'CLASS' ? 'Class quest' : 'World quest'

function DoneCard({ view }: { view: QuestView }) {
  const done = view.done!
  return (
    <Card
      accent={C.success}
      style={{
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: C.success,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="check" size={20} color={C.floor} strokeWidth={3} />
      </View>
      <View style={{ flex: 1 }}>
        <H size={16} skewLeft numberOfLines={1}>
          {view.exercise.name.toUpperCase()} · COMPLETE
        </H>
        <T size={12} color={C.steelLight}>
          {trackLabel(view)} · {setsLabel(view.exercise)}
        </T>
      </View>
      <Reward amount={done.awarded} stat={done.stat} size={24} />
    </Card>
  )
}

function QuestCard({
  view,
  featured,
  now,
}: {
  view: QuestView
  featured?: boolean
  now: number
}) {
  const nav = useNav()
  const swap = useHero((s) => s.swap)
  const harder = useHero((s) => s.harder)
  const { quest, exercise } = view
  const start = () => nav.navigate('Workout', { questId: quest.id })
  return (
    <Card featured={featured} style={{ gap: 10 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <View style={{ gap: 6, flexShrink: 1 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TapeTag label={quest.track} tilt={quest.slot % 2 ? 2 : -2} />
            <TapeTag
              label={
                quest.kind === 'ad'
                  ? 'BONUS · TODAY'
                  : `ENDS IN ${untilLabel(quest.closesAt, now)}`
              }
              tilt={quest.slot % 2 ? -2 : 2}
            />
          </View>
          <H size={22} lh={1.05} skewLeft>
            {exercise.name.toUpperCase()}
          </H>
          <T size={13} color={C.mist}>
            {setsLabel(exercise)}
            {exercise.id !== quest.exerciseId ? ' · easier' : ''}
          </T>
        </View>
        <Reward amount={quest.reward.amount} stat={quest.reward.stat} />
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {featured ? (
          <GoldButton
            label="START"
            icon="play"
            height={42}
            fontSize={17}
            trackWidth={260}
            style={{ flex: 1, borderRadius: 12 }}
            onPress={start}
          />
        ) : (
          <CrimsonButton
            label="START"
            icon="play"
            height={48}
            fontSize={17}
            style={{ flex: 1 }}
            onPress={start}
          />
        )}
        {view.harder ? (
          <SwapButton
            label="Harder"
            hint={`Swap back to ${view.harder.name.toLowerCase()}`}
            onPress={() => harder(quest.id)}
          />
        ) : null}
        <SwapButton
          label="Easier"
          hint="Swap to an easier exercise"
          onPress={() => swap(quest.id)}
          disabled={!view.canSwap}
        />
      </View>
    </Card>
  )
}

/** Rewarded-ad quests: up to MAX_AD_QUESTS a day (real ads come later). */
function AdQuestCard({ left, onAdd }: { left: number; onAdd: () => void }) {
  return (
    <Card style={{ gap: 8 }}>
      <H size={18} skewLeft>
        WANT ANOTHER QUEST?
      </H>
      <T size={13} color={C.mist}>
        Watch a short ad for a bonus quest, open until midnight. {left} of{' '}
        {MAX_AD_QUESTS} left today.
      </T>
      <CrimsonButton
        label={__DEV__ ? '+1 QUEST (DEV)' : '+1 QUEST · ADS SOON'}
        icon="play"
        height={46}
        fontSize={16}
        disabled={!__DEV__}
        onPress={onAdd}
      />
    </Card>
  )
}

export default function Quests() {
  const views = useTodayQuests()
  const now = useMinuteOfDay()
  const day = useHero((s) => s.today)
  const addAdQuest = useHero((s) => s.addAdQuest)
  const done = views.filter((v) => v.done)
  const open = views.filter((v) => !v.done)
  const next = nextQuest(day, now)
  const arrived = arrivedQuests(day, now).length + day.adQuests
  return (
    <Screen
      bpm={100}
      glow={{ cx: 0.5, cy: 0.25, rx: 0.8, ry: 0.4, opacity: 0.22 }}
    >
      <TrainingFloor />
      <Header>
        <HeaderTitle size={34}>QUESTS</HeaderTitle>
        <N size={26} lh={1} color={C.steelLight}>
          {done.length}
          <N size={26} color={C.chalk}>
            /{arrived}
          </N>
        </N>
      </Header>

      <ScrollView
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 250,
          bottom: 84,
        }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 16,
          gap: 10,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Panel
          label="QUEST BOARD"
          right={
            next
              ? `New quests in ${untilLabel(next.opensAt, now).toLowerCase()}`
              : 'Last quest of the day'
          }
        >
          <View
            style={{
              paddingTop: 10,
              paddingHorizontal: 14,
              paddingBottom: 12,
              gap: 8,
            }}
          >
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
            >
              {/* one segment per finished quest, in its stat's colour */}
              <BarbellBar
                segments={done.map((v) => [
                  1 / Math.max(arrived, 1),
                  STAT_COLOR[v.done!.stat],
                ])}
              />
              <N size={34} lh={1} style={{ paddingTop: 4 }}>
                {done.length}
                <N size={34} color={C.steelLight}>
                  /{arrived}
                </N>
              </N>
            </View>
            <T size={12} lh={1.4} color={C.mist}>
              Fresh quests arrive every 2–4 hours and replace any still open.
              Missed ones just expire, no penalty.
              {day.awarded > 0 ? ` +${day.awarded} stat points today.` : ''}
            </T>
          </View>
        </Panel>

        {done.map((v) => (
          <DoneCard key={v.quest.id} view={v} />
        ))}
        {open.map((v, i) => (
          <QuestCard key={v.quest.id} view={v} featured={i === 0} now={now} />
        ))}
        {open.length === 0 ? (
          <Card featured style={{ gap: 4 }}>
            <H size={22} skewLeft color={C.gold}>
              {next ? 'RAID POWERED UP' : 'DONE FOR TODAY'}
            </H>
            <T size={13} color={C.mist}>
              {next
                ? `New quests arrive in ${untilLabel(next.opensAt, now).toLowerCase()}. Rest up.`
                : 'That’s the last quest today. New quests start at midnight.'}
            </T>
          </Card>
        ) : null}
        {canAddAdQuest(day) ? (
          <AdQuestCard left={MAX_AD_QUESTS - day.adQuests} onAdd={addAdQuest} />
        ) : null}
      </ScrollView>

      <TabNav active="quests" />
    </Screen>
  )
}
