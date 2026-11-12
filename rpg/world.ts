// World content: regions of the open-world Map and the story chapter each
// one opens. Chapter 1 shows the first time the Map opens; each later
// chapter shows when its region is unlocked (docs/game-flow.md).
//
// Gold prices and level gates are placeholders until progression pacing is
// tested (roadmap §3.7).

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
  },
  {
    id: 'fallen-kingdom',
    name: 'Fallen Kingdom',
    price: 1500,
    level: 5,
    chapterId: 'chapter-2',
  },
  {
    id: 'ashen-wastes',
    name: 'Ashen Wastes',
    price: 5000,
    level: 10,
    chapterId: 'chapter-3',
  },
]

export const STARTING_REGION = REGIONS[0]

/**
 * A place on the Map where camp can be set. Expeditions from it face
 * enemies within its level band (docs/game-flow.md §6.3, §7).
 */
export interface CampSite {
  id: string
  regionId: string
  name: string
  /** Lowest and highest enemy level expeditions from here can face. */
  levelBand: [number, number]
  enemies: string[]
  boss: string
}

export const CAMP_SITES: CampSite[] = [
  {
    id: 'mossy-clearing',
    regionId: 'whispering-forest',
    name: 'Mossy Clearing',
    levelBand: [1, 4],
    enemies: ['Slime', 'Forest Wolf', 'Goblin', 'Brute', 'Wisp'],
    boss: 'Forest Guardian',
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
