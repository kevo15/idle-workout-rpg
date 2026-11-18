import { getExercise } from '../exercises'
import {
  ENCOUNTER_CHANCE,
  ENCOUNTER_COOLDOWN_TILES,
  encounterGold,
  nearCamp,
  nearestSite,
  pickEncounter,
  rollEncounter,
} from '../encounters'
import {
  chooseClass,
  clearSpot,
  ENCOUNTER_GOLD_WINS_PER_DAY,
  ENCOUNTER_TRAINING_PER_DAY,
  encounterWinsLeft,
  winEncounter,
  encounterTrainingLeft,
  ensurePlan,
  newHero,
  trainEncounter,
} from '../progress'
import { seeded } from '../rng'
import { CAMP_SITES, STARTING_CAMP } from '../world'
import { nightGold } from '../economy'

const forest = CAMP_SITES.filter((s) => s.mapId === 'forest')
const grass = { grass: true, safe: false }

describe('wild encounters', () => {
  it('only happen on grass, away from camp, after the cooldown', () => {
    const always = () => 0
    expect(rollEncounter(always, grass, ENCOUNTER_COOLDOWN_TILES)).toBe(true)
    expect(rollEncounter(always, { grass: false, safe: false }, 99)).toBe(false)
    expect(rollEncounter(always, { grass: true, safe: true }, 99)).toBe(false)
    expect(rollEncounter(always, grass, ENCOUNTER_COOLDOWN_TILES - 1)).toBe(
      false
    )
  })

  it('come out now and then (about ENCOUNTER_CHANCE per tile)', () => {
    const rand = seeded('walk')
    let n = 0
    for (let i = 0; i < 2000; i++) if (rollEncounter(rand, grass, 99)) n++
    expect(n / 2000).toBeGreaterThan(ENCOUNTER_CHANCE * 0.6)
    expect(n / 2000).toBeLessThan(ENCOUNTER_CHANCE * 1.4)
  })

  it('never happen right by a campfire', () => {
    const fire = forest[0].position
    expect(nearCamp(fire, forest)).toBe(true)
    expect(nearCamp({ x: fire.x + 20, y: fire.y }, forest)).toBe(false)
  })

  it('bring out the nearest area’s enemies at the low end of its band', () => {
    const rise = forest.find((s) => s.id === 'guardians-rise')!
    const p = { x: rise.position.x + 3, y: rise.position.y + 8 }
    expect(nearestSite(p, forest).id).toBe('guardians-rise')
    const rand = seeded('enc')
    for (let i = 0; i < 30; i++) {
      const e = pickEncounter(p, forest, 'warrior', rand)
      expect(rise.enemies).toContain(e.enemy)
      expect(e.level).toBeGreaterThanOrEqual(rise.levelBand[0])
      expect(e.level).toBeLessThanOrEqual(rise.levelBand[1])
      // Training is a real workout (class or world, as on the quest board)
      expect(getExercise(e.exerciseId).id).toBe(e.exerciseId)
    }
  })

  it('pays more gold for tougher enemies', () => {
    expect(encounterGold(4)).toBeGreaterThan(encounterGold(1))
  })
})

describe('training instead of fighting', () => {
  it('gives +1 to the stat, a few times a day', () => {
    let s = ensurePlan(chooseClass(newHero('p1', '2026-11-15'), 'warrior'))
    const str0 = s.stats.STR
    for (let i = 0; i < ENCOUNTER_TRAINING_PER_DAY; i++) {
      const r = trainEncounter(s, 'STR')
      expect(r.awarded).toBe(1)
      s = r.state
    }
    expect(s.stats.STR).toBe(str0 + ENCOUNTER_TRAINING_PER_DAY)
    expect(encounterTrainingLeft(s.today)).toBe(0)
    // Past the allowance: nothing more today
    const more = trainEncounter(s, 'STR')
    expect(more.awarded).toBe(0)
    expect(more.state.stats.STR).toBe(s.stats.STR)
  })
})

describe('encounter gold', () => {
  it('pays a few wins a day, then fights are for practice', () => {
    let s = ensurePlan(chooseClass(newHero('p1', '2026-11-15'), 'warrior'))
    for (let i = 0; i < ENCOUNTER_GOLD_WINS_PER_DAY; i++) {
      const r = winEncounter(s)
      expect(r.paid).toBe(true)
      s = r.state
    }
    expect(encounterWinsLeft(s.today)).toBe(0)
    expect(winEncounter(s).paid).toBe(false)
  })

  it('caps a day of encounter gold at about a quarter of a night', () => {
    for (let level = 1; level <= 10; level++)
      expect(
        ENCOUNTER_GOLD_WINS_PER_DAY * encounterGold(level)
      ).toBeLessThanOrEqual(nightGold(level) * 0.3)
  })
})

describe('enemies to find', () => {
  it('stay cleared for the day once engaged', () => {
    let s = ensurePlan(chooseClass(newHero('p1', '2026-11-15'), 'warrior'))
    s = clearSpot(s, 'forest:2026-11-15:0')
    expect(clearSpot(s, 'forest:2026-11-15:0')).toBe(s) // once
    expect(s.today.spotsCleared).toEqual(['forest:2026-11-15:0'])
  })
})

describe('encounter exercises', () => {
  it('never offers the same exercise twice in a row', () => {
    const rand = seeded('no-repeats')
    let last: string | null = null
    for (let i = 0; i < 200; i++) {
      const e = pickEncounter(
        STARTING_CAMP.position,
        [STARTING_CAMP],
        'mage',
        rand,
        last
      )
      expect(e.exerciseId).not.toBe(last)
      last = e.exerciseId
    }
  })
})

describe('encounter workout split', () => {
  it('matches the quest board: about 60% class workouts, 40% world', () => {
    const rand = seeded('split')
    let own = 0
    const n = 2000
    for (let i = 0; i < n; i++) {
      const e = pickEncounter(
        STARTING_CAMP.position,
        [STARTING_CAMP],
        'mage',
        rand
      )
      if (getExercise(e.exerciseId).classAffinity.includes('mage')) own++
    }
    expect(own / n).toBeGreaterThan(0.55)
    expect(own / n).toBeLessThan(0.65)
  })
})
