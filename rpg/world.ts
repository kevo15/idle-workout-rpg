// World content: regions of the open-world Map and the story chapter each
// one opens. Chapter 1 shows the first time the Map opens; each later
// chapter shows when its region is unlocked (docs/game-flow.md).
//
// Gold prices and level gates are placeholders until progression pacing is
// tested (roadmap §3.7).

import { regionPrice } from './economy'

export interface Chapter {
  id: string
  number: number
  title: string
  paragraphs: string[]
  /** The gold call-to-action line at the end of the card. */
  tagline: string
}

export interface Region {
  id: string
  name: string
  /** Gold to unlock; 0 = open from the start. */
  price: number
  /** Class level the region's expeditions are tuned for. */
  level: number
  chapterId: string
  /** Its overworld map (src/overworld/maps). */
  mapId: string
}

export const CHAPTERS: Record<string, Chapter> = {
  'chapter-1': {
    id: 'chapter-1',
    number: 1,
    title: 'THE QUIET WOODS',
    paragraphs: [
      'The forest past the arena gate has gone quiet. No birdsong, no wind, only the glow of wisps between the trees.',
      'Scouts say something old is waking at the heart of the woods, and the creatures are gathering around it.',
    ],
    tagline: 'TRAIN HARD. REST WELL. TONIGHT, YOU RAID.',
  },
  // Draft text for later regions; rewrite once those areas are designed.
  'chapter-2': {
    id: 'chapter-2',
    number: 2,
    title: 'THE FALLEN KINGDOM',
    paragraphs: [
      'Beyond the woods lie the ruins of a kingdom that trained for a war it never fought.',
      'Its old champions still walk the halls, waiting for a challenger worth the trouble.',
    ],
    tagline: 'EARN YOUR PLACE IN THE HALLS.',
  },
  'chapter-3': {
    id: 'chapter-3',
    number: 3,
    title: 'THE ASHEN WASTES',
    paragraphs: [
      'Past the ruins the ground turns grey and warm. Nothing grows, but something moves.',
      'Only the strongest raiders come back from the wastes, and they come back changed.',
    ],
    tagline: 'NO SHORTCUTS. ONLY REPS.',
  },
}

export const REGIONS: Region[] = [
  {
    id: 'whispering-forest',
    name: 'Whispering Forest',
    price: 0,
    level: 1,
    chapterId: 'chapter-1',
    mapId: 'forest',
  },
  {
    id: 'fallen-kingdom',
    name: 'Fallen Kingdom',
    // 1.5x the expedition gold earned on the way to level 5 (rpg/economy.ts)
    price: regionPrice(5),
    level: 5,
    chapterId: 'chapter-2',
    mapId: 'kingdom',
  },
  {
    id: 'ashen-wastes',
    name: 'Ashen Wastes',
    price: 5000,
    level: 10,
    chapterId: 'chapter-3',
    mapId: 'wastes',
  },
]

export const STARTING_REGION = REGIONS[0]

/** A point on an overworld map, in tiles. */
export interface TilePoint {
  x: number
  y: number
}

/**
 * A place on the Map where camp can be set: a campfire on an overworld map.
 * Expeditions from it face enemies within its level band (docs/game-flow.md
 * §6.3, §7).
 */
export interface CampSite {
  id: string
  regionId: string
  name: string
  /** Lowest and highest enemy level expeditions from here can face. */
  levelBand: [number, number]
  enemies: string[]
  boss: string
  /** The overworld map it's on (src/overworld/maps). */
  mapId: string
  /** The campfire's base, in tiles. */
  position: TilePoint
}

export const CAMP_SITES: CampSite[] = [
  {
    id: 'mossy-clearing',
    regionId: 'whispering-forest',
    name: 'Mossy Clearing',
    levelBand: [1, 4],
    enemies: ['Slime', 'Forest Wolf', 'Goblin', 'Brute', 'Wisp'],
    boss: 'Forest Guardian',
    mapId: 'forest',
    position: { x: 60, y: 94 },
  },
  {
    id: 'old-mill',
    regionId: 'whispering-forest',
    name: 'Old Mill',
    levelBand: [2, 5],
    enemies: ['Slime', 'Goblin', 'Brute'],
    boss: 'Forest Guardian',
    mapId: 'forest',
    position: { x: 18, y: 62 },
  },
  {
    id: 'hollow-stones',
    regionId: 'whispering-forest',
    name: 'Hollow Stones',
    levelBand: [3, 6],
    enemies: ['Forest Wolf', 'Brute', 'Wisp'],
    boss: 'Forest Guardian',
    mapId: 'forest',
    position: { x: 100, y: 58 },
  },
  {
    id: 'guardians-rise',
    regionId: 'whispering-forest',
    name: 'Guardian’s Rise',
    levelBand: [4, 8],
    enemies: ['Brute', 'Wisp', 'Goblin'],
    boss: 'Forest Guardian',
    mapId: 'forest',
    position: { x: 60, y: 24 },
  },
  {
    id: 'kings-road',
    regionId: 'fallen-kingdom',
    name: 'King’s Road',
    levelBand: [5, 8],
    enemies: ['Skeleton', 'Ghoul', 'Fallen Knight'],
    boss: 'Hollow King',
    mapId: 'kingdom',
    position: { x: 60, y: 96 },
  },
  {
    id: 'west-barracks',
    regionId: 'fallen-kingdom',
    name: 'West Barracks',
    levelBand: [6, 9],
    enemies: ['Fallen Knight', 'Skeleton', 'Gargoyle'],
    boss: 'Hollow King',
    mapId: 'kingdom',
    position: { x: 16, y: 52 },
  },
  {
    id: 'throne-plaza',
    regionId: 'fallen-kingdom',
    name: 'Throne Plaza',
    levelBand: [7, 10],
    enemies: ['Gargoyle', 'Ghoul', 'Fallen Knight'],
    boss: 'Hollow King',
    mapId: 'kingdom',
    position: { x: 60, y: 50 },
  },
  {
    id: 'cinder-camp',
    regionId: 'ashen-wastes',
    name: 'Cinder Camp',
    levelBand: [10, 13],
    enemies: ['Ash Hound', 'Cinder Imp', 'Wraith'],
    boss: 'Ember Wyrm',
    mapId: 'wastes',
    position: { x: 60, y: 96 },
  },
  {
    id: 'ash-flats',
    regionId: 'ashen-wastes',
    name: 'Ash Flats',
    levelBand: [11, 14],
    enemies: ['Cinder Imp', 'Magma Golem', 'Ash Hound'],
    boss: 'Ember Wyrm',
    mapId: 'wastes',
    position: { x: 22, y: 40 },
  },
  {
    id: 'ember-peak',
    regionId: 'ashen-wastes',
    name: 'Ember Peak',
    levelBand: [12, 15],
    enemies: ['Magma Golem', 'Wraith', 'Cinder Imp'],
    boss: 'Ember Wyrm',
    mapId: 'wastes',
    position: { x: 96, y: 22 },
  },
]

export const STARTING_CAMP = CAMP_SITES[0]

export function getCampSite(id: string): CampSite {
  const site = CAMP_SITES.find((c) => c.id === id)
  if (!site) throw new Error(`Unknown camp site: ${id}`)
  return site
}

export const regionOf = (site: CampSite) =>
  REGIONS.find((r) => r.id === site.regionId)!

/**
 * A way into another region: a gate on an overworld map, locked until that
 * region is bought with gold (Map area select). `area` is the gate itself,
 * in tiles.
 */
export interface RegionGate {
  regionId: string
  mapId: string
  area: { x: number; y: number; width: number; height: number }
}

export const REGION_GATES: RegionGate[] = [
  {
    regionId: 'fallen-kingdom',
    mapId: 'forest',
    area: { x: 57, y: 1, width: 6, height: 2 },
  },
  {
    regionId: 'ashen-wastes',
    mapId: 'kingdom',
    area: { x: 57, y: 1, width: 6, height: 2 },
  },
]

export const getRegion = (id: string): Region => {
  const r = REGIONS.find((x) => x.id === id)
  if (!r) throw new Error(`Unknown region: ${id}`)
  return r
}
