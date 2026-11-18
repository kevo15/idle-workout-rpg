/**
 * Map tab: area select. Every region with its level, camp sites and status:
 * buy the next one with gold, or pick an open one to explore (its overworld
 * opens). Buying shows the region's chapter card. Past scenes come first.
 */
import { useState } from 'react'
import { View } from 'react-native'

import { CAMP_SITES, CHAPTERS, REGIONS, type Region } from '../../rpg/world'
import { levelInfo } from '../../rpg/progress'
import { ArenaGate } from '../components/arenabackground/ArenaGate'
import { Screen, ScreenBody } from '../components/arenabackground/Screen'
import { PastScenes } from '../components/story/PastScenes'
import { StoryOverlay } from '../components/story/StoryOverlay'
import {
  Card,
  CrimsonButton,
  GoldButton,
  GoldPill,
  H,
  Header,
  HeaderTitle,
  T,
  TapeTag,
} from '../components/ui'
import { useNav } from '../navigation/useNav'
import { canBuyNext, isOpen, useCamp } from '../state/useCamp'
import { useHero } from '../state/useHero'
import { C } from '../theme/tokens'
import { formatGold } from '../utils/format'

export default function MapScreen() {
  const nav = useNav()
  const gold = useCamp((s) => s.gold)
  const areaId = useCamp((s) => s.areaId)
  const campId = useCamp((s) => s.siteId)
  const unlocked = useCamp((s) => s.unlocked)
  const buy = useCamp((s) => s.buyRegion)
  const select = useCamp((s) => s.selectArea)
  const level = useHero((s) => levelInfo(s.stats).level)
  const seen = useHero((s) => s.seenChapters)
  const seeChapter = useHero((s) => s.seeChapter)

  const [story, setStory] = useState<string | null>(null)
  const closeStory = () => {
    if (story) seeChapter(story)
    setStory(null)
  }
  const current = REGIONS.find((r) => r.id === areaId) ?? REGIONS[0]
  const camp = CAMP_SITES.find((s) => s.id === campId)

  const explore = (r: Region) => {
    if (select(r.id)) nav.replace('Overworld', { regionId: r.id })
  }

  return (
    <Screen
      bpm={120}
      split={394}
      tab="map"
      overlay={
        story && CHAPTERS[story] ? (
          <StoryOverlay
            chapter={CHAPTERS[story]}
            regionName={REGIONS.find((r) => r.chapterId === story)?.name ?? ''}
            onClose={closeStory}
          />
        ) : undefined
      }
    >
      <ArenaGate />
      <Header>
        <HeaderTitle>MAP</HeaderTitle>
        <GoldPill amount={formatGold(gold)} />
      </Header>

      <ScreenBody style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}>
        <PastScenes seen={seen} onPick={setStory} />
        <T size={13} color={C.mist}>
          Camp: {camp?.name ?? '—'} · Your hero is level {level}. Pick an area
          to explore, or unlock the next one with gold.
        </T>
        {REGIONS.map((r) => (
          <RegionCard
            key={r.id}
            region={r}
            current={r.id === current.id}
            open={isOpen(unlocked, r.id)}
            inOrder={canBuyNext(unlocked, r.id)}
            gold={gold}
            level={level}
            campHere={camp?.regionId === r.id}
            onExplore={() => explore(r)}
            onBuy={() => {
              if (buy(r.id) && !seen.includes(r.chapterId))
                setStory(r.chapterId)
            }}
          />
        ))}
      </ScreenBody>
    </Screen>
  )
}

function RegionCard({
  region,
  current,
  open,
  inOrder,
  gold,
  level,
  campHere,
  onExplore,
  onBuy,
}: {
  region: Region
  current: boolean
  open: boolean
  inOrder: boolean
  gold: number
  level: number
  campHere: boolean
  onExplore: () => void
  onBuy: () => void
}) {
  const chapter = CHAPTERS[region.chapterId]
  const sites = CAMP_SITES.filter((s) => s.regionId === region.id)
  const short = region.price - gold
  const status = current ? 'CURRENT' : open ? 'OPEN' : 'LOCKED'
  return (
    <Card featured={current} accent={open ? C.crimson : C.steel}>
      <View style={{ gap: 8 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <T f="body700" size={11} ls={0.1} color={C.steelLight}>
            CHAPTER {chapter?.number} · LEVEL {region.level}+
          </T>
          <TapeTag label={status} tilt={2} />
        </View>
        <H size={22} lh={1} skewLeft color={open ? C.chalk : C.mist}>
          {region.name.toUpperCase()}
        </H>
        <T size={13} lh={1.45} color={C.mist}>
          {sites.length} camp sites · enemies level {sites[0]?.levelBand[0]}–
          {Math.max(...sites.map((s) => s.levelBand[1]))}.
          {campHere ? ' Your camp is here.' : ''}
          {!open && level < region.level
            ? ` Tough for your level ${level} hero.`
            : ''}
        </T>
        {open ? (
          current ? (
            <GoldButton
              label="EXPLORE"
              icon="map"
              height={44}
              fontSize={17}
              trackWidth={360}
              onPress={onExplore}
            />
          ) : (
            <CrimsonButton
              label="SELECT AND EXPLORE"
              icon="map"
              height={44}
              fontSize={16}
              onPress={onExplore}
            />
          )
        ) : (
          <>
            <GoldButton
              label={`UNLOCK · ${formatGold(region.price)} GOLD`}
              height={44}
              fontSize={16}
              trackWidth={360}
              disabled={!inOrder || short > 0}
              onPress={onBuy}
            />
            {!inOrder ? (
              <T size={12} color={C.steelLight}>
                Open the area before it first.
              </T>
            ) : short > 0 ? (
              <T size={12} color={C.steelLight}>
                {formatGold(short)} more gold needed. Expeditions earn gold.
              </T>
            ) : null}
          </>
        )}
      </View>
    </Card>
  )
}
