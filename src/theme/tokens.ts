/** Iron Arena design tokens — values copied from docs/ui-theme.md and docs/mockups/*. */
export const C = {
  floor: '#111114',
  floorDeep: '#0B0B0D',
  iron: '#1E1F24',
  ironDark: '#16171B',
  ironTrack: '#2A2C33',
  silhouette: '#26272D',
  steel: '#3A3D45',
  steelLight: '#8A8F99',
  mist: '#C9CBD1',
  parchment: '#E4E1DA',
  chalk: '#F4F1EA',
  crimson: '#C8102E',
  deepRed: '#7A0C14',
  gold: '#F2B233',
  goldDark: '#9A6B0E',
  hype: '#FF6A1A',
  success: '#3DDC84',
  strText: '#FF5A6E',
  wallBottom: '#1A0D10',
} as const

export type StatKey = 'STR' | 'END' | 'AGI' | 'VIT'

export const STAT_ORDER: StatKey[] = ['STR', 'END', 'AGI', 'VIT']

export const STAT_COLOR: Record<StatKey, string> = {
  STR: C.crimson,
  END: C.hype,
  AGI: C.gold,
  VIT: C.success,
}

/** Text-legible variant (crimson on iron is too dark for small text). */
export const STAT_TEXT: Record<StatKey, string> = {
  STR: C.strText,
  END: C.hype,
  AGI: C.gold,
  VIT: C.success,
}

export const F = {
  display: 'LilitaOne_400Regular',
  num: 'Teko_600SemiBold',
  numMedium: 'Teko_500Medium',
  body: 'Inter_400Regular',
  body500: 'Inter_500Medium',
  body600: 'Inter_600SemiBold',
  body700: 'Inter_700Bold',
  body800: 'Inter_800ExtraBold',
} as const

/** Design canvas — mockups are drawn at iPhone 14 size. */
export const DESIGN_W = 390
export const DESIGN_H = 844
export const SKEW = '-6deg'
