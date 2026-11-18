/** Camp (home) — docs/mockups/camp.html (guild gym, 80 BPM). */
import { levelInfo } from '../../rpg/progress'
import { useState } from 'react'
import { CLASS_ORDER } from '../../rpg/classes'
import type { ClassId } from '../../rpg/types'
import { goTab, useNav } from '../navigation/useNav'
import { Pressable, View } from 'react-native'
import {
  Circle,
  G,
  Line,
  Path,
  Polygon,
  Rect,
  Text as SvgText,
} from 'react-native-svg'

import { Sprite } from '../components/arenabackground/Sprite'
import { Icon } from '../components/ui/Icon'
import {
  Scrim,
  SceneSvg,
  Screen,
  ScreenBody,
} from '../components/arenabackground/Screen'
import {
  Card,
  CrimsonButton,
  GoldButton,
  GoldPill,
  H,
  Header,
  HeaderTitle,
  N,
  Panel,
  PlateRing,
  T,
} from '../components/ui'
import {
  CrowdRow,
  FloorShapes,
  Floodlight,
  Puff,
} from '../components/arenabackground/parts'
import { approachInfo, phaseAt } from '../../rpg/expedition'
import { getCampSite, regionOf } from '../../rpg/world'
import { useNow } from '../hooks/useNow'
import { previewResult, useCamp } from '../state/useCamp'
import { formatGold } from '../utils/format'
import { arrivedQuests, nextQuest } from '../../rpg/progress'
import { useHero, useMinuteOfDay, useTodayQuests } from '../state/useHero'
import { C, F } from '../theme/tokens'

function CampScene() {
  return (
    <>
      <Floodlight
        lamp={[66, 104, 28, 7]}
        beam={[
          [70, 111],
          [90, 111],
          [150, 260],
          [10, 260],
        ]}
        topOpacity={0.22}
        swing={{ name: 'swing', period: 8 }}
      />
      <Floodlight
        lamp={[296, 104, 28, 7]}
        beam={[
          [300, 111],
          [320, 111],
          [380, 260],
          [240, 260],
        ]}
        topOpacity={0.22}
        swing={{ name: 'swing', period: 8, reverse: true }}
      />
      <SceneSvg>
        <Rect x={0} y={146} width={390} height={14} fill="#17181C" />
        <Rect x={0} y={160} width={390} height={14} fill="#1B1C21" />
      </SceneSvg>
      <CrowdRow x1={40} x2={160} y={141} gap={46} />
      <CrowdRow x1={250} x2={370} y={155} gap={58} offset={0.5} />
      <SceneSvg>
        <Line
          x1={226}
          y1={104}
          x2={226}
          y2={116}
          stroke={C.steel}
          strokeWidth={1.5}
        />
        <Line
          x1={254}
          y1={104}
          x2={254}
          y2={116}
          stroke={C.steel}
          strokeWidth={1.5}
        />
        <Polygon
          points="214,116 266,116 266,190 240,178 214,190"
          fill={C.crimson}
          stroke={C.gold}
          strokeWidth={2}
        />
        <SvgText
          x={240}
          y={158}
          textAnchor="middle"
          fontFamily={F.display}
          fontSize={22}
          fill={C.gold}
        >
          RR
        </SvgText>
      </SceneSvg>
      <Sprite
        box={[319, 111, 22, 115]}
        pivot={[330, 111]}
        anim={{ name: 'sway', period: 4 }}
        svg={
          <>
            <Line
              x1={330}
              y1={111}
              x2={330}
              y2={160}
              stroke={C.steel}
              strokeWidth={2}
            />
            <Rect
              x={319}
              y={160}
              width={22}
              height={66}
              rx={9}
              fill={C.silhouette}
            />
          </>
        }
      />
      <SceneSvg>
        <G fill="#2A2C33">
          <Rect x={18} y={214} width={132} height={5} />
          <Rect x={18} y={236} width={132} height={5} />
          <Rect x={20} y={214} width={5} height={36} />
          <Rect x={143} y={214} width={5} height={36} />
        </G>
        <G fill={C.silhouette}>
          {[34, 48, 64, 78, 94, 108, 124, 138].map((cx) => (
            <Circle key={cx} cx={cx} cy={207} r={6} />
          ))}
          {[38, 50, 74, 86, 110, 122].map((cx) => (
            <Circle key={cx} cx={cx} cy={230} r={5} />
          ))}
          <Circle cx={172} cy={241} r={9} />
          <Circle cx={196} cy={243} r={7} />
        </G>
        <G fill="none" stroke={C.silhouette} strokeWidth={3}>
          <Path d="M166 236a6 6 0 0 1 12 0" />
          <Path d="M191 239a5 5 0 0 1 10 0" />
        </G>
        <FloorShapes y={250} />
      </SceneSvg>
      <Puff cx={60} cy={246} r={3} />
      <Puff cx={104} cy={244} r={2.5} offset={1} />
      <Puff cx={186} cy={246} r={3} offset={2} />
      <Puff cx={300} cy={245} r={2.5} offset={3} />
      <Scrim top={240} solidAt={0.18} />
    </>
  )
}

function Stat({
  value,
  label,
  gold,
  divided,
  size = 52,
}: {
  value: string
  label: string
  gold?: boolean
  divided?: boolean
  /** Shrink long values so they fit a third of the panel. */
  size?: number
}) {
  return (
    <View
      style={[
        { flex: 1, alignItems: 'center' },
        divided
          ? { borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.steel }
          : null,
      ]}
    >
      {/* fixed-height slot keeps the labels aligned across sizes */}
      <View
        style={{
          height: 52,
          justifyContent: 'flex-end',
          alignSelf: 'stretch',
          alignItems: 'center',
          paddingHorizontal: 4,
        }}
      >
        <N size={size} lh={1} fit color={gold ? C.gold : C.chalk}>
          {value}
        </N>
      </View>
      <T f="body700" size={10} ls={0.12} color={C.steelLight}>
        {label}
      </T>
    </View>
  )
}

function LinkCard({
  onPress,
  lead,
  title,
  sub,
  disabled,
}: {
  onPress: () => void
  lead: React.ReactNode
  title: string
  sub: string
  disabled?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {lead}
        <View style={{ flex: 1, gap: 2 }}>
          <H size={16} ls={0.02} skewLeft>
            {title}
          </H>
          <T size={13} color={C.mist}>
            {sub}
          </T>
        </View>
        {disabled ? null : (
          <Icon name="chevron" size={18} color={C.steelLight} />
        )}
      </Card>
    </Pressable>
  )
}

/** "5H 12M" left on an expedition. */
function timeLeft(ms: number) {
  const mins = Math.max(0, Math.ceil(ms / 60000))
  return `${Math.floor(mins / 60)}H ${String(mins % 60).padStart(2, '0')}M`
}

function DevControls({ running }: { running: boolean }) {
  const nav = useNav()
  const toCheckpoint = useCamp((s) => s.devToCheckpoint)
  const toMorning = useCamp((s) => s.devToMorning)
  const site = getCampSite(useCamp((s) => s.siteId))
  const own = useHero((s) => s.classId) ?? 'warrior'
  const [picking, setPicking] = useState(false)
  const heroLevel = useHero((s) => levelInfo(s.stats).level)
  /** Enemy level relative to yours: −1, the same, or +2. */
  const [offset, setOffset] = useState(0)
  /** The class chips start combat training instead (rpg/tutorial.ts). */
  const [training, setTraining] = useState(false)
  if (!__DEV__) return null
  const link = (label: string, onPress: () => void) => (
    <Pressable onPress={onPress} hitSlop={8}>
      <T f="body700" size={11} ls={0.1} color={C.steelLight}>
        {label}
      </T>
    </Pressable>
  )
  // SPAR: pick a class to fight as (yours, or any other at your level,
  // without changing your hero) and an enemy around your level
  const spar = (asClass: ClassId) => {
    setPicking(false)
    if (training) {
      nav.navigate('Fight', {
        tutorial: true,
        ...(asClass === own ? {} : { asClass }),
      })
      return
    }
    nav.navigate('Fight', {
      enemy: site.enemies[Math.floor(Math.random() * site.enemies.length)],
      level: Math.max(1, heroLevel + offset),
      ...(asClass === own ? {} : { asClass }),
    })
  }
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18 }}>
        {running ? link('DEV: TO CHECKPOINT', toCheckpoint) : null}
        {running ? link('DEV: TO MORNING', toMorning) : null}
        {link(picking ? 'DEV: SPAR ▲' : 'DEV: SPAR', () =>
          setPicking(!picking)
        )}
      </View>
      {picking ? (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {[-1, 0, 2].map((o) => {
            const on = !training && o === offset
            return (
              <Pressable
                key={o}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`Enemy level ${Math.max(1, heroLevel + o)}`}
                onPress={() => {
                  setOffset(o)
                  setTraining(false)
                }}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: on ? C.gold : C.steel,
                  backgroundColor: on ? C.deepRed : '#16171B',
                }}
              >
                <T f="body700" size={11} ls={0.1} color={on ? C.gold : C.chalk}>
                  {`ENEMY LV ${Math.max(1, heroLevel + o)}${o === 0 ? ' (YOURS)' : o > 0 ? ` (+${o})` : ` (${o})`}`}
                </T>
              </Pressable>
            )
          })}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: training }}
            accessibilityLabel="Combat training"
            onPress={() => setTraining(true)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: training ? C.gold : C.steel,
              backgroundColor: training ? C.deepRed : '#16171B',
            }}
          >
            <T
              f="body700"
              size={11}
              ls={0.1}
              color={training ? C.gold : C.chalk}
            >
              TRAINING
            </T>
          </Pressable>
        </View>
      ) : null}
      {picking ? (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {CLASS_ORDER.map((c) => (
            <Pressable
              key={c}
              accessibilityRole="button"
              accessibilityLabel={`Spar as ${c}`}
              onPress={() => spar(c)}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: c === own ? C.gold : C.steel,
                backgroundColor: '#16171B',
              }}
            >
              <T
                f="body700"
                size={11}
                ls={0.1}
                color={c === own ? C.gold : C.chalk}
              >
                {c.toUpperCase()}
              </T>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  )
}

export default function Camp() {
  const nav = useNav()
  const now = useNow(1000)
  const gold = useCamp((s) => s.gold)
  const current = useCamp((s) => s.current)
  const hasLog = useCamp((s) => s.log.length > 0)
  const claim = useCamp((s) => s.claim)
  const site = getCampSite(useCamp((s) => s.siteId))
  const region = regionOf(site)

  const phase = current ? phaseAt(current, now) : null
  const result = current && phase === 'DONE' ? previewResult(current) : null

  const views = useTodayQuests()
  const minute = useMinuteOfDay()
  const day = useHero((s) => s.today)
  const hasClass = useHero((s) => s.classId !== null)
  const open = views.find((v) => !v.done)
  const next = nextQuest(day, minute)
  const q = {
    done: views.filter((v) => v.done).length,
    total: arrivedQuests(day, minute).length + day.adQuests,
  }
  const wait = (m: number) =>
    `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`
  const questLine = !hasClass
    ? 'Pick a class to get your first quests.'
    : open
      ? `Quests ready, starting with ${open.exercise.name.toLowerCase()}.`
      : next
        ? `New quests in ${wait(next.opensAt - minute)}. RAID POWERED UP.`
        : 'Done for today. New quests start at midnight.'

  const label = !current
    ? `TONIGHT · ${site.name.toUpperCase()}`
    : phase === 'DONE'
      ? `OVERNIGHT RESULTS · ${region.name.toUpperCase()}`
      : `EXPEDITION UNDERWAY · ${region.name.toUpperCase()}`

  // YOUR CALL: plan the next run, answer a checkpoint, or wait
  const call = !current
    ? {
        sub: 'Plan tonight’s expedition: choose your approach.',
        go: () => nav.navigate('Plan'),
      }
    : phase === 'WAITING'
      ? {
          sub: 'A Brute blocks the path. Pick a move.',
          go: () => nav.navigate('Replay', { mode: 'decision' }),
        }
      : phase === 'DONE'
        ? { sub: 'Claim tonight’s gold, then plan the next run.', go: null }
        : {
            sub: 'Your hero is on the road. Checkpoints show up here.',
            go: null,
          }

  return (
    <Screen
      split={266}
      tab="camp"
      bpm={80}
      glow={{ cx: 0.5, cy: 0.25, rx: 0.8, ry: 0.4, opacity: 0.22 }}
    >
      <CampScene />
      <Header>
        <HeaderTitle>CAMP</HeaderTitle>
        <GoldPill amount={formatGold(gold)} />
      </Header>

      <ScreenBody
        style={{
          paddingHorizontal: 16,
          paddingBottom: 16,
          gap: 12,
        }}
      >
        <Panel label={label} stripPad={[7, 14]}>
          {!current ? (
            <View style={{ paddingTop: 12, paddingHorizontal: 14, gap: 4 }}>
              <H size={22} skewLeft>
                {hasLog ? 'READY FOR ANOTHER RUN' : 'YOUR FIRST EXPEDITION'}
              </H>
              <T size={13} lh={1.45} color={C.mist}>
                Camp is set at {site.name} in the {region.name}. Enemies here
                are levels {site.levelBand[0]}–{site.levelBand[1]}.
              </T>
            </View>
          ) : (
            <View
              style={{
                flexDirection: 'row',
                paddingTop: 8,
                paddingHorizontal: 6,
                paddingBottom: 4,
              }}
            >
              {result ? (
                <>
                  <Stat value={`${result.hours}H`} label="EXPLORED" />
                  <Stat value={`${result.won}`} label="BATTLES WON" divided />
                  <Stat value={`+${result.gold}`} label="GOLD" gold />
                </>
              ) : (
                <>
                  <Stat
                    value={timeLeft(
                      current.startedAt + current.durationMs - now
                    )}
                    label="TIME LEFT"
                    size={36}
                  />
                  <Stat
                    value={approachInfo(current.approach).label}
                    label="APPROACH"
                    divided
                    size={26}
                  />
                  <Stat
                    value={`LV ${current.enemyLevel}`}
                    label="ENEMIES"
                    gold
                  />
                </>
              )}
            </View>
          )}
          <View
            style={{
              flexDirection: 'row',
              gap: 10,
              paddingTop: 12,
              paddingHorizontal: 14,
              paddingBottom: 14,
            }}
          >
            <CrimsonButton
              label="REPLAY"
              icon="play"
              iconSize={14}
              height={50}
              fontSize={17}
              style={{ flex: 1 }}
              disabled={!hasLog}
              onPress={() => nav.navigate('ReplayLog')}
            />
            {result ? (
              <GoldButton
                label="CLAIM GOLD"
                height={44}
                fontSize={17}
                trackWidth={200}
                style={{ flex: 1.3, borderRadius: 12 }}
                onPress={() => claim()}
              />
            ) : (
              <GoldButton
                label="YOUR CALL"
                height={44}
                fontSize={17}
                trackWidth={200}
                style={{ flex: 1.3, borderRadius: 12 }}
                disabled={!call.go}
                onPress={() => call.go?.()}
              />
            )}
          </View>
        </Panel>

        <LinkCard
          onPress={() => call.go?.()}
          disabled={!call.go}
          lead={
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                backgroundColor: C.deepRed,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="swords" size={22} />
            </View>
          }
          title="YOUR CALL"
          sub={call.sub}
        />

        <LinkCard
          onPress={() => goTab(nav, 'Quests')}
          lead={
            <PlateRing
              fraction={q.total ? q.done / q.total : 0}
              label={`${q.done}/${q.total}`}
              a11y={`${q.done} of ${q.total} quests done`}
            />
          }
          title="TODAY’S QUESTS"
          sub={questLine}
        />

        <DevControls running={!!current && phase !== 'DONE'} />
      </ScreenBody>
    </Screen>
  )
}
