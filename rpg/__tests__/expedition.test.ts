import {
  EXPEDITION_MS,
  enemyLevel,
  newExpedition,
  phaseAt,
  placeholderResult,
  playThroughFights,
  playThroughBonus,
  placeholderBattles,
  checkpointBattle,
  type Approach,
  CHECKPOINT,
  expeditionResult,
  CHECKPOINT_BOOST,
  checkpointBoostExercise,
  checkpointWatchChance,
  checkpointWatchWins,
  WARMUP_EXERCISE,
  type Expedition,
} from '../expedition'
import { getExercise } from '../exercises'
import { profileAt } from '../balance'
import { enemyFighter, heroFighter, kindOf, simulate } from '../fight'
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

describe('playThroughFights', () => {
  it('picks up to 3 key fights at the expedition’s enemy level', () => {
    const e = start('BALANCED')
    const r = placeholderResult(e)
    const fights = playThroughFights(e, r, site)
    expect(fights.length).toBeGreaterThanOrEqual(1)
    expect(fights.length).toBeLessThanOrEqual(3)
    for (const f of fights) expect(f.level).toBe(e.enemyLevel)
    // The checkpoint fight is the Brute that blocked the path
    if (r.battles >= 3) expect(fights.map((f) => f.enemy)).toContain('Brute')
  })

  it('is the same every time for the same expedition', () => {
    const e = start('AGGRESSIVE')
    const r = placeholderResult(e)
    expect(playThroughFights(e, r, site)).toEqual(playThroughFights(e, r, site))
  })
})

describe('taking control at the checkpoint', () => {
  it('pays more for beating the Brute than losing to it', () => {
    const e = start('BALANCED')
    const won = placeholderResult({ ...e, call: 'won' })
    const lost = placeholderResult({ ...e, call: 'lost' })
    expect(won.gold).toBeGreaterThan(lost.gold)
    expect(won.won).toBeGreaterThanOrEqual(lost.won)
    // Either way the night carries on (only running away ends it early)
    expect(won.hours).toBe(EXPEDITION_MS / 3600_000)
    expect(lost.hours).toBe(EXPEDITION_MS / 3600_000)
  })

  it('replays the checkpoint fight the way the player’s own fight went', () => {
    for (const call of ['won', 'lost'] as const) {
      const e = { ...start('BALANCED'), call }
      const fights = playThroughFights(e, placeholderResult(e), site)
      const brute = fights.find((f) => f.enemy === 'Brute')
      if (brute) expect(brute.won).toBe(call === 'won')
    }
  })
})

describe('checkpoint: watch it play out', () => {
  const exp = (id: string, heroLevel: number, enemyLevel: number) =>
    ({ id, heroLevel, enemyLevel }) as Expedition

  it('offers WATCH between taking control and running', () => {
    expect(CHECKPOINT.options.map((o) => o.id)).toEqual([
      'fight',
      'watch',
      'retreat',
    ])
  })

  it('the boost set raises the odds, and level gaps matter', () => {
    expect(checkpointWatchChance(5, 5, false)).toBeCloseTo(0.5)
    expect(checkpointWatchChance(5, 5, true)).toBeCloseTo(
      0.5 + CHECKPOINT_BOOST
    )
    expect(checkpointWatchChance(3, 6, false)).toBeLessThan(0.5)
    expect(checkpointWatchChance(20, 1, true)).toBeLessThanOrEqual(0.9)
    expect(checkpointWatchChance(1, 20, false)).toBeGreaterThanOrEqual(0.15)
  })

  it('decides the ending once per expedition, boosted wins more often', () => {
    expect(checkpointWatchWins(exp('a', 5, 5), true)).toBe(
      checkpointWatchWins(exp('a', 5, 5), true)
    )
    let plain = 0
    let boosted = 0
    for (let i = 0; i < 400; i++) {
      if (checkpointWatchWins(exp(`e${i}`, 5, 5), false)) plain++
      if (checkpointWatchWins(exp(`e${i}`, 5, 5), true)) boosted++
    }
    expect(boosted).toBeGreaterThan(plain)
    expect(plain / 400).toBeGreaterThan(0.4)
    expect(plain / 400).toBeLessThan(0.6)
  })

  it('the boost set is one of the class’s exercises, not its warm-up', () => {
    for (const cls of ['warrior', 'archer', 'mage', 'summoner', 'rogue']) {
      const id = checkpointBoostExercise(exp('x', 3, 3), cls)
      expect(id).not.toBe(WARMUP_EXERCISE[cls])
      expect(getExercise(id).classAffinity).toContain(cls)
    }
  })
})

describe('watching the checkpoint pays less than taking control', () => {
  it('a watched win earns less gold than a win you fought yourself', () => {
    const base = newExpedition({
      id: 'pay',
      site: STARTING_CAMP,
      approach: 'BALANCED',
      heroLevel: 3,
      warmup: false,
      now: 0,
    })
    const fought = placeholderResult({ ...base, call: 'won' })
    const watched = placeholderResult({ ...base, call: 'watch-won' })
    expect(watched.gold).toBeLessThan(fought.gold)
    expect(placeholderResult({ ...base, call: 'watch-lost' }).gold).toBe(
      placeholderResult({ ...base, call: 'lost' }).gold
    )
  })
})

describe('nights fought with the fight engine', () => {
  const night = (
    over: Partial<Expedition> = {},
    stats = profileAt('warrior', 4)
  ) => ({
    ...newExpedition({
      id: 'night1',
      site: STARTING_CAMP,
      approach: 'BALANCED',
      heroLevel: 4,
      warmup: false,
      now: 0,
      heroStats: stats,
      classId: 'warrior',
    }),
    ...over,
  })

  it('fights every battle and records it', () => {
    const r = expeditionResult(night(), STARTING_CAMP)
    expect(r.records).toHaveLength(r.battles)
    expect(r.won).toBe(r.records!.filter((b) => b.won).length)
    expect(r.gold).toBeGreaterThan(0)
  })

  it('is the same night every time it is settled', () => {
    expect(expeditionResult(night(), STARTING_CAMP)).toEqual(
      expeditionResult(night(), STARTING_CAMP)
    )
  })

  it('replays each recorded battle exactly as it went (WATCH)', () => {
    const e = night()
    const r = expeditionResult(e, STARTING_CAMP)
    const hero = heroFighter(e.heroStats!, 'warrior')
    for (const b of r.records!.filter((x) => x.seed)) {
      const f = simulate(
        {
          hero,
          enemy: enemyFighter(kindOf(b.enemy), b.level),
          enemyLevel: b.level,
        },
        { seed: b.seed!, skill: b.skill }
      )
      expect(f.winner === 'hero').toBe(b.won)
    }
    const picks = playThroughFights(e, r, STARTING_CAMP)
    expect(picks.some((p) => p.plan)).toBe(true)
  })

  it('a stronger hero wins more of the night than a weak one', () => {
    const strong = expeditionResult(
      night({}, profileAt('warrior', 9)),
      STARTING_CAMP
    )
    const weak = expeditionResult(
      night({}, { STR: 1, END: 1, AGI: 1, VIT: 1 }),
      STARTING_CAMP
    )
    expect(strong.won / strong.battles).toBeGreaterThan(weak.won / weak.battles)
  })

  it('the checkpoint Brute ends the way the player decided it', () => {
    const won = expeditionResult(night({ call: 'won' }), STARTING_CAMP)
    const lost = expeditionResult(night({ call: 'lost' }), STARTING_CAMP)
    const cp = checkpointBattle(won.battles)
    expect(won.records![cp]).toMatchObject({ enemy: 'Brute', won: true })
    expect(lost.records![cp]).toMatchObject({ enemy: 'Brute', won: false })
    expect(won.gold).toBeGreaterThan(lost.gold)
  })

  it('a retreat ends early, with a short night', () => {
    const r = expeditionResult(night({ call: 'retreat' }), STARTING_CAMP)
    expect(r.hours).toBe(1)
    expect(r.battles).toBe(2)
  })

  it('saves from before the sim still settle (the old estimate)', () => {
    const old = { ...night(), heroStats: undefined }
    const r = expeditionResult(old, STARTING_CAMP)
    expect(r.records).toBeUndefined()
    expect(r.battles).toBeGreaterThan(0)
  })
})
