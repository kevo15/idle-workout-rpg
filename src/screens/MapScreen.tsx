/** Map: the open world (docs/game-flow.md §7). For now: regions, camp, past scenes. */
import { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'

import { Icon } from '../components/ui/Icon'
import { Screen } from '../components/arenabackground/Screen'
import { TabNav } from '../components/ui/TabNav'
import {
  Card,
  GoldPill,
  H,
  Header,
  HeaderTitle,
  N,
  Panel,
  T,
  TapeTag,
} from '../components/ui'
import { ArenaGate } from '../components/arenabackground/ArenaGate'
import { levelInfo } from '../../rpg/progress'
import { CHAPTERS, REGIONS, STARTING_REGION } from '../../rpg/world'
import { StoryOverlay } from '../components/story/StoryOverlay'
import { useCamp } from '../state/useCamp'
import { useHero } from '../state/useHero'
import { formatGold } from '../utils/format'
import { C, SKEW } from '../theme/tokens'

const region = (id: string) => REGIONS.find((r) => r.id === id)!

export default function MapScreen() {
  const gold = useCamp((s) => s.gold)
  const seen = useHero((s) => s.seenChapters)
  const seeChapter = useHero((s) => s.seeChapter)
  const level = useHero((s) => levelInfo(s.stats).level)
  // Camp lives in the starting region until moving camp is built
  const camp = STARTING_REGION

  // Chapter 1 opens the first time the Map does; later chapters open as
  // their regions unlock (gold unlocks arrive with the economy)
  const firstUnseen = REGIONS.find(
    (r) => r.price === 0 && !seen.includes(r.chapterId)
  )
  const [open, setOpen] = useState<string | null>(
    firstUnseen ? firstUnseen.chapterId : null
  )
  const close = () => {
    if (open) seeChapter(open)
    setOpen(null)
  }
  const openRegion = REGIONS.find((r) => r.chapterId === open)

  return (
    <Screen bpm={120}>
      <ArenaGate />
      <Header>
        <HeaderTitle>MAP</HeaderTitle>
        <GoldPill amount={formatGold(gold)} />
      </Header>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ position: 'absolute', left: 0, right: 0, top: 114 }}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {REGIONS.map((r) =>
          r.price === 0 ? (
            <View
              key={r.id}
              accessibilityLabel={`${r.name}, unlocked`}
              style={{
                height: 40,
                paddingHorizontal: 14,
                borderRadius: 8,
                backgroundColor: C.crimson,
                justifyContent: 'center',
                transform: [{ skewX: SKEW }],
              }}
            >
              <T f="display" size={15} ls={0.03}>
                {r.name.toUpperCase()}
              </T>
            </View>
          ) : (
            <View
              key={r.id}
              accessibilityLabel={`${r.name}, locked, ${r.price} gold, level ${r.level}`}
              style={{
                height: 40,
                paddingHorizontal: 12,
                borderRadius: 8,
                backgroundColor: C.floor,
                borderWidth: 1.5,
                borderColor: C.steel,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Icon name="lock" size={13} color={C.mist} />
              <T f="body600" size={12} color={C.mist}>
                {r.name}
              </T>
              <N size={18} color={C.gold}>
                {formatGold(r.price)}
              </N>
            </View>
          )
        )}
      </ScrollView>

      <ScrollView
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 394,
          bottom: 84,
        }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 16,
          gap: 10,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Card featured style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TapeTag label="CAMP SET HERE" />
            <TapeTag label={`LEVEL ${camp.level}+ AREA`} tilt={2} />
          </View>
          <H size={20} skewLeft>
            {camp.name.toUpperCase()}
          </H>
          <T size={13} lh={1.5} color={C.mist}>
            Slime, Forest Wolf, Goblin, Brute and Wisp.{' '}
            <T f="body700" size={13} color={C.gold}>
              Boss:
            </T>{' '}
            the Forest Guardian. Your hero is level {level}.
          </T>
        </Card>

        <Panel label="PAST SCENES" right={`${seen.length} unlocked`}>
          <View style={{ padding: 10, gap: 8 }}>
            {seen.length === 0 ? (
              <T size={13} color={C.mist} style={{ padding: 4 }}>
                Story scenes you unlock appear here to watch again.
              </T>
            ) : (
              seen.map((id) => {
                const ch = CHAPTERS[id]
                const r = REGIONS.find((x) => x.chapterId === id)
                if (!ch || !r) return null
                return (
                  <Pressable
                    key={id}
                    accessibilityRole="button"
                    accessibilityLabel={`Replay chapter ${ch.number}`}
                    onPress={() => setOpen(id)}
                    style={({ pressed }) => ({
                      height: 52,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      backgroundColor: C.ironDark,
                      borderWidth: 1,
                      borderColor: C.steel,
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <Icon name="play" size={14} color={C.gold} />
                    <View style={{ flex: 1 }}>
                      <T f="body700" size={11} ls={0.12} color={C.steelLight}>
                        CHAPTER {ch.number} · {r.name.toUpperCase()}
                      </T>
                      <H size={16}>{ch.title}</H>
                    </View>
                    <Icon name="chevron" size={18} color={C.steelLight} />
                  </Pressable>
                )
              })
            )}
          </View>
        </Panel>

        <Card style={{ gap: 4 }}>
          <H size={16} skewLeft>
            OPEN WORLD · COMING NEXT
          </H>
          <T size={13} lh={1.45} color={C.mist}>
            Walk your hero through each area, move camp, and spend gold to open
            new regions and their chapters.
          </T>
        </Card>
      </ScrollView>

      <TabNav active="map" />

      {open && openRegion ? (
        <StoryOverlay
          chapter={CHAPTERS[open]}
          regionName={region(openRegion.id).name}
          onClose={close}
        />
      ) : null}
    </Screen>
  )
}
