import {
  EXPEDITION_MS,
  enemyLevel,
  newExpedition,
  phaseAt,
  placeholderResult,
  playThroughBonus,
  placeholderBattles,
  checkpointBattle,
  type Approach,
} from '../expedition'
import { STARTING_CAMP } from '../world'

const site = STARTING_CAMP // levels 1–4
const start = (approach: Approach, heroLevel = 2, warmup = false) =>
  newExpedition({ id: 'e1', site, approach, heroLevel, warmup, now: 0 })

describe('enemyLevel', () => {
  it('puts Cautious below, Balanced at and Aggressive above the hero', () => {
    expect(enemyLevel(3, site, 'CAUTIOUS')).toBe(1)
    expect(enemyLevel(3, site, 'BALANCED')).toBe(3)
    expect(enemyLevel(3, site, 'AGGRESSIVE')).toBe(4) // clamped to the band
  })

  it('stays inside the camp site level band', () => {
    expect(enemyLevel(1, site, 'CAUTIOUS')).toBe(1)
    expect(enemyLevel(9, site, 'BALANCED')).toBe(4)
  })
})

describe('expedition phases', () => {
  it('runs, stops at the checkpoint, then finishes after 8 hours', () => {
    const e = start('BALANCED')
    expect(phaseAt(e, 1000)).toBe('RUNNING')
    expect(phaseAt(e, EXPEDITION_MS / 4)).toBe('WAITING')
    expect(phaseAt({ ...e, call: 'guard' }, EXPEDITION_MS / 4)).toBe('RUNNING')
    expect(phaseAt(e, EXPEDITION_MS)).toBe('DONE')
  })

  it('ends at once on a retreat', () => {
    expect(phaseAt({ ...start('BALANCED'), call: 'retreat' }, 10)).toBe('DONE')
  })
})

describe('placeholderResult', () => {
  it('is the same every time for the same expedition', () => {
    expect(placeholderResult(start('BALANCED'))).toEqual(
      placeholderResult(start('BALANCED'))
    )
  })

  it('pays more for Aggressive than Cautious, and more after a warm-up', () => {
    const cautious = placeholderResult(start('CAUTIOUS', 3))
    const aggressive = placeholderResult(start('AGGRESSIVE', 3))
    expect(aggressive.gold).toBeGreaterThan(cautious.gold)
    expect(placeholderResult(start('BALANCED', 2, true)).gold).toBeGreaterThan(
      placeholderResult(start('BALANCED', 2, false)).gold
    )
  })

  it('uses the offline default call when the player never answers', () => {
    expect(placeholderResult(start('AGGRESSIVE')).call).toBe('strike')
    expect(placeholderResult(start('CAUTIOUS')).call).toBe('guard')
  })

  it('keeps wins within battles and gives a positive play-through bonus', () => {
    const r = placeholderResult(start('BALANCED'))
    expect(r.won).toBeLessThanOrEqual(r.battles)
    expect(playThroughBonus(r)).toBeGreaterThan(0)
  })
})

describe('placeholderBattles', () => {
  it('matches the result totals and is stable', () => {
    const e = start('BALANCED')
    const r = placeholderResult(e)
    const battles = placeholderBattles(e, r, site)
    expect(battles).toHaveLength(r.battles)
    expect(battles.filter((b) => b.won)).toHaveLength(r.won)
    expect(placeholderBattles(e, r, site)).toEqual(battles)
    const cp = checkpointBattle(r.battles)
    expect(cp).toBeGreaterThanOrEqual(0)
    expect(cp).toBeLessThan(r.battles)
  })
})
