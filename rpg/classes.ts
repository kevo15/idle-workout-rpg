import type { ClassId, StatKey } from './types'

export interface CharacterClass {
  id: ClassId
  name: string
  /** Short label for the 5-up class picker. */
  short: string
  playable: boolean
  desc: string
  workoutTheme: string
  fightStyle: string
  /**
   * Starting stats for a new hero of this class. Every class gets the same
   * total (BASE_STAT_TOTAL), spread toward its fighting style; training adds
   * to these from there.
   */
  baseStats: Record<StatKey, number>
  /** Stat interpretation weights from the roadmap §3.9 (sum 1). */
  statWeights: Record<StatKey, number>
  abilities: string[]
}

/** Every class starts with this many stat points in total. */
export const BASE_STAT_TOTAL = 20

export const CLASSES: Record<ClassId, CharacterClass> = {
  warrior: {
    id: 'warrior',
    name: 'WARRIOR',
    short: 'WARRIOR',
    playable: true,
    desc: 'Built for power and endurance. Wins by outlasting the enemy.',
    workoutTheme: 'push-ups, squats and plank holds',
    fightStyle: 'takes hits up front and strikes hard',
    baseStats: { STR: 7, END: 5, AGI: 3, VIT: 5 },
    statWeights: { STR: 0.45, AGI: 0.1, END: 0.15, VIT: 0.3 },
    abilities: ['Guard', 'Counter', 'Heavy Strike'],
  },
  archer: {
    id: 'archer',
    name: 'ARCHER',
    short: 'ARCHER',
    playable: true,
    desc: 'Built for speed and precision. Wins by staying out of reach.',
    workoutTheme: 'side steps, lunges and quick feet',
    fightStyle: 'strikes from range and dodges often',
    baseStats: { STR: 4, END: 5, AGI: 7, VIT: 4 },
    statWeights: { STR: 0.2, AGI: 0.45, END: 0.25, VIT: 0.1 },
    abilities: ['Focus Target', 'Special Arrow', 'Evade'],
  },
  mage: {
    id: 'mage',
    name: 'MAGE',
    short: 'MAGE',
    playable: false,
    desc: 'Elemental spells, area and status effects.',
    workoutTheme: 'squats, lunges and core work',
    fightStyle: 'casts elemental attacks',
    baseStats: { STR: 3, END: 8, AGI: 4, VIT: 5 },
    statWeights: { STR: 0.1, AGI: 0.15, END: 0.5, VIT: 0.25 },
    abilities: [],
  },
  summoner: {
    id: 'summoner',
    name: 'SUMMONER',
    short: 'SUMMON',
    playable: false,
    desc: 'Commands one elemental companion.',
    workoutTheme: 'bird dogs, wall sits and step-ups',
    fightStyle: 'deploys a companion',
    baseStats: { STR: 3, END: 7, AGI: 4, VIT: 6 },
    statWeights: { STR: 0.15, AGI: 0.15, END: 0.45, VIT: 0.25 },
    abilities: [],
  },
  rogue: {
    id: 'rogue',
    name: 'ROGUE',
    short: 'ROGUE',
    playable: false,
    desc: 'Evasion, rapid strikes and burst windows.',
    workoutTheme: 'lateral lunges and knee raises',
    fightStyle: 'strikes fast and evades',
    baseStats: { STR: 5, END: 4, AGI: 8, VIT: 3 },
    statWeights: { STR: 0.25, AGI: 0.45, END: 0.2, VIT: 0.1 },
    abilities: [],
  },
}

export const CLASS_ORDER: ClassId[] = [
  'warrior',
  'archer',
  'mage',
  'summoner',
  'rogue',
]

export type { ClassId, StatKey } from './types'
