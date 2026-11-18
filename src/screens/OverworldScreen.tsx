/**
 * Overworld: a region's open world (docs/game-flow.md §7), built like Shadow
 * Sprinter's. Opened from the Map tab's area select. Walk the hero with the
 * joystick; at a campfire, see its level band and enemies and SET CAMP HERE;
 * at a gate, buy the next region or travel to it. Portrait or landscape
 * (Settings).
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Animated, Image, Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { levelInfo } from '../../rpg/progress'
import {
  useIsFocused,
  useRoute,
  type RouteProp,
} from '@react-navigation/native'

import {
  CAMP_SITES,
  CHAPTERS,
  getCampSite,
  getRegion,
  REGION_GATES,
  REGIONS,
  regionOf,
  type CampSite,
  type RegionGate,
} from '../../rpg/world'
import { BeatProvider } from '../components/arenabackground/beat'
import { Screen, ScreenBody } from '../components/arenabackground/Screen'
import { StoryOverlay } from '../components/story/StoryOverlay'
import {
  GoldButton,
  GoldPill,
  H,
  Icon,
  IconButton,
  Panel,
  HomeButton,
  SettingsButton,
  T,
  TapeTag,
} from '../components/ui'
import type { RootStackParamList } from '../navigation/types'
import { goTab, useNav } from '../navigation/useNav'
import { handFight } from '../navigation/fightRoute'
import { heroMapAnims, MAP_GROUNDS } from '../overworld/assets'
import { Campfire } from '../overworld/components/Campfire'
import { Gate } from '../overworld/components/Gate'
import HeroSprite from '../overworld/components/HeroSprite'
import Joystick from '../overworld/components/Joystick'
import { MapObjects } from '../overworld/components/MapObjects'
import { MiniMap } from '../overworld/components/MiniMap'
import { MAPS } from '../overworld/maps'
import { CHUNK_H, CHUNK_W } from '../overworld/sceneObjects'
import {
  cellOf,
  chunksIn,
  depthBand,
  drawWindow,
  placeSprites,
  spritesIn,
} from '../overworld/sceneObjects'
import { TILE, type Point } from '../overworld/mapTypes'
import {
  CAMPFIRE_REACH,
  overworldScale,
  reachAt,
  reachKey,
  type Reach,
} from '../overworld/reach'
import {
  useOverworldMovement,
  type StickVector,
} from '../overworld/useOverworldMovement'
import { LoadingScreen } from '../components/loading/LoadingScreen'
import { useLoad } from '../components/loading/useLoad'
import { firstViewImages, loadedShare, preloadMap } from '../overworld/preload'
import {
  nearCamp,
  pickEncounter,
  rollEncounter,
  type Encounter,
} from '../../rpg/encounters'
import { encounterTrainingLeft, encounterWinsLeft } from '../../rpg/progress'
import { EncounterCard } from '../overworld/components/EncounterCard'
import SpotEnemy from '../overworld/components/SpotEnemy'
import { daySpots, spotAt } from '../overworld/spots'
import { useBackButton } from '../navigation/useBack'
import { canBuyNext, isOpen, useCamp } from '../state/useCamp'
import { useHero } from '../state/useHero'
import { C } from '../theme/tokens'
import { formatGold } from '../utils/format'

/** Tips on the map's loading screen. */
const MAP_TIPS = [
  'Wild enemies hide in the grass: stay on the dirt roads to avoid them.',
  'Red dots on the mini-map are tougher enemies to find. They move every day.',
  'Walk up to a campfire to see its level and enemies.',
  'Set camp where the enemies match your level.',
  'Tap the mini-map to see the whole area.',
  'Gates lead to new areas. Unlock them with gold.',
  'Your camp’s fire glows gold on the map.',
]

/**
 * The exercise the last encounter offered (for this play session): the next
 * one is always a different exercise.
 */
let lastExercise: string | null = null
const nextExercise = (id: string) => {
  lastExercise = id
  return id
}

export default function OverworldScreen() {
  const nav = useNav()
  const { regionId } =
    useRoute<RouteProp<RootStackParamList, 'Overworld'>>().params
  const region = getRegion(regionId)
  const insets = useSafeAreaInsets()
  const gold = useCamp((s) => s.gold)
  const campId = useCamp((s) => s.siteId)
  const running = useCamp((s) => s.current !== null)
  const setSite = useCamp((s) => s.setSite)
  const level = useHero((s) => levelInfo(s.stats).level)
  const classId = useHero((s) => s.classId)
  const heroAnims = heroMapAnims(classId)
  const winsLeft = useHero((s) => encounterWinsLeft(s.today))
  const date = useHero((s) => s.today.date)
  const spotsCleared = useHero((s) => s.today.spotsCleared)
  const clearSpot = useHero((s) => s.clearSpot)
  const trainingLeft = useHero((s) => encounterTrainingLeft(s.today))
  const focused = useIsFocused()
  const seeChapter = useHero((s) => s.seeChapter)

  const camp = CAMP_SITES.find((s) => s.id === campId) ?? CAMP_SITES[0]
  const map = MAPS[region.mapId]
  const campHere = camp.mapId === map.id
  const ground = MAP_GROUNDS[map.id]
  const sites = useMemo(
    () => CAMP_SITES.filter((s) => s.mapId === map.id),
    [map.id]
  )
  const gates = useMemo(
    () => REGION_GATES.filter((g) => g.mapId === map.id),
    [map.id]
  )
  const sprites = useMemo(() => placeSprites(map), [map])

  // Enemies to find today (red dots), minus the ones already engaged
  const allSpots = useMemo(
    () => daySpots(map, sites, gates, date),
    [map, sites, gates, date]
  )
  const spots = useMemo(
    () => allSpots.filter((s) => !(spotsCleared ?? []).includes(s.id)),
    [allSpots, spotsCleared]
  )
  const spotsRef = useRef(spots)
  spotsRef.current = spots
  /** After RUN AWAY: that enemy waits until the hero has walked off. */
  const leftAlone = useRef<string | null>(null)

  // ---- layout ----
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null
  )
  const landscape = !!size && size.width > size.height
  const view = size
    ? { width: size.width, height: size.height }
    : { width: 1, height: 1 }
  const scale = overworldScale(view.width, view.height)

  // ---- story ----
  // A region's chapter card shows the first time its overworld opens
  const [story, setStory] = useState<string | null>(() =>
    useHero.getState().seenChapters.includes(region.chapterId)
      ? null
      : region.chapterId
  )
  const [bigMap, setBigMap] = useState(false)

  // ---- loading ----
  // The loading screen stays until the files are downloaded (preloadMap)
  // AND every image the first view shows has actually loaded on screen
  // (each reports through markLoaded). `entered` latches once that's true.
  const [loadProgress, setLoadProgress] = useState(0)
  const assets = useLoad(
    () => preloadMap(map.id, setLoadProgress, classId),
    [map.id]
  )
  const loadedRef = useRef(new Set<string>())
  const [, setLoadedCount] = useState(0)
  const markLoaded = useCallback((key: string) => {
    if (loadedRef.current.has(key)) return
    loadedRef.current.add(key)
    setLoadedCount((n) => n + 1)
  }, [])
  const onSheetLoad = useCallback(
    (sheet: string) => markLoaded(`sheet:${sheet}`),
    [markLoaded]
  )
  const onHeroLoad = useCallback(() => markLoaded('hero'), [markLoaded])
  const onHeroWalkLoad = useCallback(
    () => markLoaded('hero-walk'),
    [markLoaded]
  )
  const onMiniLoad = useCallback(() => markLoaded('mini'), [markLoaded])
  const [entered, setEntered] = useState(false)
  // LEAVE AREA; Android back does the same
  const leaveArea = () => nav.replace('Map')
  useBackButton(() => {
    if (encounter)
      setEncounter(null) // an open card: back = RUN
    else if (bigMap) setBigMap(false)
    else leaveArea()
  })
  // The grass tip: shown for a while each time the hero enters the area
  const [tip, setTip] = useState(false)
  useEffect(() => {
    if (!entered) return
    setTip(true)
    const t = setTimeout(() => setTip(false), 7000)
    return () => clearTimeout(t)
  }, [entered])
  const closeStory = () => {
    if (story) seeChapter(story)
    setStory(null)
  }

  // ---- walking ----
  const stickRef = useRef<StickVector>({ x: 0, y: 0 })
  const pausedRef = useRef(false)
  // Leaving unmounts it (tabs and the area list use replace), so only its
  // own overlays pause the hero
  // A wild encounter (rpg/encounters.ts): the card is up, the hero waits
  const [encounter, setEncounter] = useState<Encounter | null>(null)
  pausedRef.current =
    !size ||
    !entered ||
    story !== null ||
    bigMap ||
    encounter !== null ||
    !focused // a fight or workout on top: the hero waits where they are

  // Re-render only when the hero crosses into a new culling cell, a new
  // depth band, or into reach of a campfire/gate
  // The hero starts at the camp's fire when camp is on this map, else at
  // the map's way in. Only on opening: moving camp doesn't teleport the hero
  const [spawn] = useState(() =>
    campHere ? { x: camp.position.x, y: camp.position.y + 2 } : map.spawn
  )
  const [cell, setCell] = useState(() =>
    cellOf({ x: spawn.x * TILE, y: spawn.y * TILE })
  )
  const [band, setBand] = useState(0)
  const [reach, setReach] = useState<Reach>(null)
  const cellRef = useRef(cell)
  const bandRef = useRef(-1)
  const reachRef = useRef('')
  // Encounters: roll once per tile walked on grass
  const walk = useRef({ last: null as Point | null, acc: 0, tilesSince: 0 })
  const onMove = useCallback(
    (feet: Point) => {
      const w = walk.current
      // An enemy to find, within reach: it steps out
      if (pausedRef.current === false && classId) {
        const spot = spotAt(feet, spotsRef.current)
        if (!spot) leftAlone.current = null
        else if (spot.id !== leftAlone.current) {
          leftAlone.current = spot.id
          stickRef.current = { x: 0, y: 0 }
          const tile = { x: spot.x, y: spot.y }
          setEncounter({
            enemy: spot.enemy,
            level: spot.level,
            siteId: spot.siteId,
            exerciseId: nextExercise(
              pickEncounter(tile, sites, classId, Math.random, lastExercise)
                .exerciseId
            ),
            spotId: spot.id,
          })
          w.last = feet
          return
        }
      }
      if (w.last && pausedRef.current === false && classId) {
        w.acc += Math.hypot(feet.x - w.last.x, feet.y - w.last.y)
        while (w.acc >= TILE) {
          w.acc -= TILE
          const tile = {
            x: Math.floor(feet.x / TILE),
            y: Math.floor(feet.y / TILE),
          }
          const grass = map.terrain[tile.y]?.[tile.x] === '.'
          const safe =
            nearCamp(tile, sites) ||
            gates.some(
              (g) =>
                Math.abs(tile.x - (g.area.x + g.area.width / 2)) < 6 &&
                tile.y < g.area.y + g.area.height + 5
            )
          if (grass && !safe) w.tilesSince++
          if (rollEncounter(Math.random, { grass, safe }, w.tilesSince)) {
            w.tilesSince = 0
            w.acc = 0
            stickRef.current = { x: 0, y: 0 }
            const met = pickEncounter(
              tile,
              sites,
              classId,
              Math.random,
              lastExercise
            )
            nextExercise(met.exerciseId)
            setEncounter(met)
            break
          }
        }
      }
      w.last = feet
      const c = cellOf(feet)
      if (c.cx !== cellRef.current.cx || c.cy !== cellRef.current.cy) {
        cellRef.current = c
        setCell(c)
      }
      const b = depthBand(sprites, feet.y)
      if (b !== bandRef.current) {
        bandRef.current = b
        setBand(b)
      }
      const r = reachAt(feet, sites, gates)
      const k = reachKey(r)
      if (k !== reachRef.current) {
        reachRef.current = k
        setReach(r)
      }
    },
    [sprites, sites, gates, map, classId]
  )

  const { feetX, feetY, camX, camY, facing, moving } = useOverworldMovement({
    map,
    scale,
    viewport: view,
    stickRef,
    isPausedRef: pausedRef,
    onMove,
    spawn,
  })

  // ---- culling ----
  const win = useMemo(
    () =>
      drawWindow(cell, {
        width: view.width / scale,
        height: view.height / scale,
      }),
    [cell, view.width, view.height, scale]
  )
  const near = useMemo(() => spritesIn(sprites, win), [sprites, win])
  const chunks = useMemo(
    () => chunksIn(win, ground.cols, ground.rows),
    [win, ground.cols, ground.rows]
  )

  // Ready when the first view's images are all on screen
  const required = useMemo(
    () => (size ? firstViewImages(chunks, near) : []),
    [size, chunks, near]
  )
  const imagesShare = loadedShare(required, loadedRef.current)
  const filesDone = assets.status !== 'loading'
  useEffect(() => {
    if (!entered && filesDone && required.length > 0 && imagesShare === 1)
      setEntered(true)
  }, [entered, filesDone, required.length, imagesShare])
  // Never trap the player behind a stuck image: go in after 15 s regardless
  useEffect(() => {
    if (entered || !size) return
    const timer = setTimeout(() => setEntered(true), 15000)
    return () => clearTimeout(timer)
  }, [entered, size])
  const loadingProgress = entered ? 1 : 0.4 * loadProgress + 0.6 * imagesShare

  const mapW = map.terrain[0].length * TILE * scale
  const mapH = map.terrain.length * TILE * scale
  const pad = { left: insets.left + 12, right: insets.right + 12 }
  const top = insets.top + 8

  return (
    // The overworld isn't a <Screen>, but the theme's animated pieces (the
    // gold buttons' hazard stripes) still need the beat clock
    <BeatProvider bpm={120}>
      <View
        style={styles.root}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout
          setSize((s) =>
            s && s.width === width && s.height === height
              ? s
              : { width, height }
          )
        }}
      >
        {size ? (
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: view.width,
              height: view.height,
              overflow: 'hidden',
            }}
          >
            {/* The world */}
            <AnimatedWorld camX={camX} camY={camY} width={mapW} height={mapH}>
              {chunks.map(({ col, row }) => (
                <Image
                  key={`${col}-${row}`}
                  source={ground.chunks[`${col}-${row}`]}
                  onLoad={() => markLoaded(`chunk:${col}-${row}`)}
                  onError={() => markLoaded(`chunk:${col}-${row}`)}
                  style={{
                    position: 'absolute',
                    left: col * CHUNK_W * TILE * scale,
                    top: row * CHUNK_H * TILE * scale,
                    width:
                      Math.min(CHUNK_W, map.terrain[0].length - col * CHUNK_W) *
                      TILE *
                      scale,
                    height:
                      Math.min(CHUNK_H, map.terrain.length - row * CHUNK_H) *
                      TILE *
                      scale,
                  }}
                />
              ))}
              {gates.map((g) => (
                <Gate
                  key={g.regionId}
                  area={g.area}
                  scale={scale}
                  zIndex={
                    2 * depthBand(sprites, (g.area.y + g.area.height) * TILE) +
                    1
                  }
                />
              ))}
              {sites.map((s) => (
                <Campfire
                  key={s.id}
                  at={s.position}
                  scale={scale}
                  reach={CAMPFIRE_REACH}
                  lit={s.id === campId}
                  zIndex={2 * depthBand(sprites, s.position.y * TILE) + 1}
                />
              ))}
              <MapObjects items={near} scale={scale} onLoad={onSheetLoad} />
              {spots
                .filter(
                  (sp) =>
                    sp.x * TILE >= win.x &&
                    sp.x * TILE < win.x + win.width &&
                    sp.y * TILE >= win.y &&
                    sp.y * TILE < win.y + win.height
                )
                .map((sp) => (
                  <SpotEnemy
                    key={sp.id}
                    spot={sp}
                    scale={scale}
                    zIndex={2 * depthBand(sprites, (sp.y + 1) * TILE) + 1}
                  />
                ))}
              <HeroSprite
                anim={moving ? heroAnims.walk : heroAnims.idle}
                facing={facing}
                x={feetX}
                y={feetY}
                scale={scale}
                zIndex={2 * band + 1}
                onLoad={onHeroLoad}
              />
              {/* The running sheet, loaded ahead so the first step doesn't blink */}
              <Image
                source={heroAnims.walk.src}
                onLoad={onHeroWalkLoad}
                onError={onHeroWalkLoad}
                style={{
                  position: 'absolute',
                  width: 1,
                  height: 1,
                  opacity: 0,
                }}
              />
            </AnimatedWorld>

            {/* Thumbstick: anywhere on the left half (or the lower part in portrait) */}
            <Joystick
              vectorRef={stickRef}
              style={
                landscape
                  ? [styles.stick, { width: view.width / 2 }]
                  : [
                      styles.stick,
                      { top: view.height * 0.35, width: view.width },
                    ]
              }
            />

            {/* Top bar: the way out (to chapter select), gold, settings */}
            <View
              style={[styles.topBar, { top, left: pad.left, right: pad.right }]}
              pointerEvents="box-none"
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Leave this area, back to chapter select"
                onPress={leaveArea}
                style={({ pressed }) => [
                  styles.leave,
                  { opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Icon name="map" size={18} color={C.gold} />
                <View>
                  <T f="body800" size={12} ls={0.1}>
                    LEAVE AREA
                  </T>
                  <T f="body700" size={9} ls={0.1} color={C.steelLight}>
                    TO CHAPTER SELECT
                  </T>
                </View>
              </Pressable>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <GoldPill amount={formatGold(gold)} />
                <HomeButton />
                <SettingsButton />
              </View>
            </View>
            <View
              pointerEvents="none"
              style={[
                styles.titleChip,
                {
                  position: 'absolute',
                  top: top + 52,
                  left: pad.left,
                  maxWidth: view.width - pad.left - pad.right - 140,
                },
              ]}
            >
              <H size={18} lh={1} skew>
                {map.name.toUpperCase()}
              </H>
              <T f="body700" size={10} ls={0.1} color={C.steelLight}>
                HERO LV {level} · CAMP: {camp.name.toUpperCase()}
              </T>
            </View>

            {/* Mini-map */}
            <View
              style={{ position: 'absolute', right: pad.right, top: top + 52 }}
            >
              <MiniMap
                map={map}
                onLoad={onMiniLoad}
                ptsPerTile={landscape ? 0.9 : 1}
                feetX={feetX}
                feetY={feetY}
                worldScale={scale}
                sites={sites}
                gates={gates}
                campId={campId}
                enemies={spots}
                label="Open the full map"
                onPress={() => setBigMap(true)}
              />
            </View>

            {/* At a campfire or gate */}
            {reach ? (
              <View
                style={[
                  styles.sheet,
                  landscape
                    ? {
                        right: pad.right,
                        bottom: insets.bottom + 12,
                        width: 340,
                      }
                    : {
                        left: pad.left,
                        right: pad.right,
                        bottom: insets.bottom + 12,
                      },
                ]}
              >
                {reach.kind === 'site' ? (
                  <SitePanel
                    site={reach.site}
                    level={level}
                    current={reach.site.id === campId}
                    running={running}
                    onSet={() => {
                      if (setSite(reach.site.id)) goTab(nav, 'Camp')
                    }}
                  />
                ) : (
                  <GatePanel gate={reach.gate} />
                )}
              </View>
            ) : null}
          </View>
        ) : null}

        {tip && !encounter && size ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss tip"
            onPress={() => setTip(false)}
            style={[
              styles.tip,
              {
                top: top + (landscape ? 52 : 116),
                left: landscape ? size.width / 2 - 220 : pad.left,
                right: landscape ? undefined : pad.right,
                width: landscape ? 440 : undefined,
              },
            ]}
          >
            <View style={styles.tipIcon}>
              <Icon name="help" size={24} color={C.gold} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <T f="body800" size={16} ls={0.04} color={C.gold}>
                Wild enemies hide in the grass
              </T>
              <T size={14} lh={1.45} color={C.chalk}>
                Stick to dirt roads to avoid them. Red dots on the mini-map are
                tougher enemies to find.
              </T>
              <T f="body700" size={10} ls={0.12} color={C.steelLight}>
                TAP TO DISMISS
              </T>
            </View>
          </Pressable>
        ) : null}

        {encounter ? (
          <EncounterCard
            encounter={encounter}
            area={getCampSite(encounter.siteId).name}
            winsLeft={winsLeft}
            trainingLeft={trainingLeft}
            compact={landscape}
            onFight={() => {
              if (encounter.spotId) clearSpot(encounter.spotId)
              setEncounter(null)
              nav.navigate(
                'Fight',
                handFight({
                  encounter: { enemy: encounter.enemy, level: encounter.level },
                })
              )
            }}
            onTrain={() => {
              if (encounter.spotId) clearSpot(encounter.spotId)
              setEncounter(null)
              nav.navigate('Workout', { encounter: encounter.exerciseId })
            }}
            onRun={() => setEncounter(null)}
          />
        ) : null}

        {bigMap && size ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close the map"
            onPress={() => setBigMap(false)}
            style={[StyleSheet.absoluteFill, styles.dim]}
          >
            <MiniMap
              map={map}
              ptsPerTile={Math.min(
                (size.width - 48) / map.terrain[0].length,
                (size.height - 96) / map.terrain.length
              )}
              feetX={feetX}
              feetY={feetY}
              worldScale={scale}
              sites={sites}
              gates={gates}
              campId={campId}
              enemies={spots}
              label="Full map"
            />
            <T f="body700" size={12} ls={0.15} color={C.mist}>
              TAP TO CLOSE · GOLD FIRE = YOUR CAMP
            </T>
          </Pressable>
        ) : null}

        {story && CHAPTERS[story] ? (
          <View style={StyleSheet.absoluteFill}>
            <Screen
              bpm={120}
              overlay={
                <StoryOverlay
                  chapter={CHAPTERS[story]}
                  regionName={
                    REGIONS.find((r) => r.chapterId === story)?.name ?? ''
                  }
                  onClose={closeStory}
                />
              }
            >
              <ScreenBody>{null}</ScreenBody>
            </Screen>
          </View>
        ) : null}
        <LoadingScreen
          ready={entered}
          title="ENTERING"
          subtitle={region.name}
          progress={loadingProgress}
          tips={MAP_TIPS}
        />
      </View>
    </BeatProvider>
  )
}

/** The world layer, moved by the camera (Animated, so no re-render). */
function AnimatedWorld({
  camX,
  camY,
  width,
  height,
  children,
}: {
  camX: Parameters<typeof Animated.add>[0]
  camY: Parameters<typeof Animated.add>[0]
  width: number
  height: number
  children: ReactNode
}) {
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width,
        height,
        transform: [{ translateX: camX }, { translateY: camY }],
      }}
    >
      {children}
    </Animated.View>
  )
}

function SitePanel({
  site,
  level,
  current,
  running,
  onSet,
}: {
  site: CampSite
  level: number
  current: boolean
  running: boolean
  onSet: () => void
}) {
  const region = regionOf(site)
  const chapter = CHAPTERS[region.chapterId]
  const [lo, hi] = site.levelBand
  return (
    <Panel label={`CAMP SITE · CHAPTER ${chapter?.number ?? 1}`}>
      <View style={{ padding: 12, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <H size={22} lh={1} skewLeft style={{ flexShrink: 1 }}>
            {site.name.toUpperCase()}
          </H>
          <TapeTag label={`LEVELS ${lo}–${hi}`} tilt={2} />
        </View>
        <T size={13} lh={1.45} color={C.mist}>
          {site.enemies.join(', ')}.{' '}
          <T f="body700" size={13} color={C.gold}>
            Boss:
          </T>{' '}
          the {site.boss}.{' '}
          {level < lo
            ? `Tough for your level ${level} hero.`
            : level > hi
              ? `Easy for your level ${level} hero.`
              : `A good match for your level ${level} hero.`}
        </T>
        {current ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="flame" size={18} color={C.gold} />
            <T f="body700" size={13} color={C.gold}>
              CAMP IS SET HERE
            </T>
          </View>
        ) : (
          <>
            <GoldButton
              label="SET CAMP HERE"
              height={46}
              fontSize={18}
              trackWidth={360}
              disabled={running}
              onPress={onSet}
            />
            {running ? (
              <T size={12} lh={1.4} color={C.hype}>
                Your hero is out on an expedition. Move camp once its gold is
                claimed.
              </T>
            ) : null}
          </>
        )}
      </View>
    </Panel>
  )
}

function GatePanel({ gate }: { gate: RegionGate }) {
  const nav = useNav()
  const region = getRegion(gate.regionId)
  const gold = useCamp((s) => s.gold)
  const unlocked = useCamp((s) => s.unlocked)
  const buy = useCamp((s) => s.buyRegion)
  const select = useCamp((s) => s.selectArea)
  const open = isOpen(unlocked, region.id)
  const inOrder = canBuyNext(unlocked, region.id)
  const short = region.price - gold
  return (
    <Panel label={open ? 'GATE · OPEN' : 'LOCKED GATE'}>
      <View style={{ padding: 12, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <H size={22} lh={1} skewLeft style={{ flexShrink: 1 }}>
            {region.name.toUpperCase()}
          </H>
          <TapeTag label={`LEVEL ${region.level}+`} tilt={2} />
        </View>
        {open ? (
          <GoldButton
            label={`TRAVEL TO ${region.name.toUpperCase()}`}
            height={46}
            fontSize={16}
            trackWidth={360}
            onPress={() => {
              if (select(region.id))
                nav.replace('Overworld', { regionId: region.id })
            }}
          />
        ) : (
          <>
            <T size={13} lh={1.45} color={C.mist}>
              The way on is barred. It opens for{' '}
              <T f="body700" size={13} color={C.gold}>
                {formatGold(region.price)} gold
              </T>
              .{' '}
              {!inOrder
                ? 'Open the area before it first.'
                : short > 0
                  ? `You need ${formatGold(short)} more.`
                  : ''}
            </T>
            <GoldButton
              label={`UNLOCK · ${formatGold(region.price)}`}
              height={46}
              fontSize={17}
              trackWidth={360}
              disabled={!inOrder || short > 0}
              onPress={() => buy(region.id)}
            />
          </>
        )}
      </View>
    </Panel>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.floorDeep },
  stick: { position: 'absolute', left: 0, bottom: 0, top: 0 },
  topBar: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  tip: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    // Partly see-through: the map stays visible behind it
    backgroundColor: 'rgba(17,17,20,0.62)',
    borderWidth: 1.5,
    borderColor: 'rgba(242,178,51,0.7)',
  },
  tipIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(242,178,51,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(242,178,51,0.5)',
  },
  leave: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(17,17,20,0.9)',
    borderWidth: 1.5,
    borderColor: C.gold,
  },
  titleChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(17,17,20,0.85)',
    borderWidth: 1,
    borderColor: C.steel,
    gap: 4,
    flexShrink: 1,
  },
  sheet: { position: 'absolute' },
  dim: {
    backgroundColor: 'rgba(11,11,13,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
})
