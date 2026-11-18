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
    workoutTheme: 'upper body: push-ups, chair dips, arm circles and planks',
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
    workoutTheme: 'lower body: lunges, squats, mountain climbers and wall sits',
    fightStyle: 'strikes from range and dodges often',
    baseStats: { STR: 4, END: 5, AGI: 7, VIT: 4 },
    statWeights: { STR: 0.2, AGI: 0.45, END: 0.25, VIT: 0.1 },
    abilities: ['Focus Target', 'Special Arrow', 'Evade'],
  },
  mage: {
    id: 'mage',
    name: 'MAGE',
    short: 'MAGE',
    playable: true,
    desc: 'Built for stamina and focus. Wins with elemental spells.',
    workoutTheme: 'core: sit-ups, heel touches, planks, dead bugs and twists',
    fightStyle: 'casts fire, frost and lightning from the back line',
    baseStats: { STR: 3, END: 8, AGI: 4, VIT: 5 },
    statWeights: { STR: 0.1, AGI: 0.15, END: 0.5, VIT: 0.25 },
    abilities: ['Fire Bolt', 'Frost Ward', 'Chain Lightning'],
  },
  summoner: {
    id: 'summoner',
    name: 'SUMMONER',
    short: 'SUMMON',
    playable: true,
    desc: 'Built for steady endurance. Wins with an elemental companion.',
    workoutTheme: 'full body: burpees, push-ups, squats and sit-ups',
    fightStyle: 'deploys one elemental companion and directs it',
    baseStats: { STR: 3, END: 7, AGI: 4, VIT: 6 },
    statWeights: { STR: 0.15, AGI: 0.15, END: 0.45, VIT: 0.25 },
    abilities: ['Summon', 'Water Ball', 'Recall'],
  },
  rogue: {
    id: 'rogue',
    name: 'ROGUE',
    short: 'ROGUE',
    playable: true,
    desc: 'Built for quickness. Wins with fast strikes and burst windows.',
    workoutTheme: 'bursts: lunges, burpees, jump squats and high knees',
    fightStyle: 'strikes fast, dodges and slips away',
    baseStats: { STR: 5, END: 4, AGI: 8, VIT: 3 },
    statWeights: { STR: 0.25, AGI: 0.45, END: 0.2, VIT: 0.1 },
    abilities: ['Dodge', 'Combo', 'Disengage'],
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
