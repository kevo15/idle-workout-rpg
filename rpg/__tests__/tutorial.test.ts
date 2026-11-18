import { baseStats } from '../progress'
import type { ClassId } from '../classes'
import {
  enemyFighter,
  heroFighter,
  kindOf,
  newFight,
  NO_INPUT,
  stepFight,
  type Fight,
  type FightInput,
} from '../fight'
import { FIGHT_TIPS, tutorialSteps } from '../tutorial'

const CLASS_IDS: ClassId[] = ['warrior', 'rogue', 'archer', 'mage', 'summoner']

/** A player following the prompts: what they'd press for each step. */
function player(stepId: string, f: Fight, frame: number): FightInput {
  const h = f.hero
  const e = f.enemy
  const toward = e.x > h.x ? 1 : -1
  const blowComing =
    e.state === 'attack' && e.stats.windupMs - e.t < 110 && e.t < 400
  const dodge = blowComing && h.dodgeReadyAt <= f.now
  switch (stepId) {
    case 'move':
      return { ...NO_INPUT, move: toward }
    case 'attack':
    case 'water':
      return {
        ...NO_INPUT,
        move: Math.abs(e.x - h.x) > h.stats.reach - 4 ? toward : 0,
        attack: frame % 6 === 0,
      }
    case 'jump':
      return { ...NO_INPUT, jump: frame % 30 === 0 }
    case 'shove':
      return { ...NO_INPUT, move: toward, dodge: frame % 20 === 0 }
    case 'counter':
      // Dodge the blow, then counter
      if (h.counterUntil > f.now) {
        // The back-step carries you off: step in, then the thrust
        const far = Math.abs(e.x - h.x) > h.stats.reach - 4
        return { ...NO_INPUT, move: far ? toward : 0, attack: !far }
      }
      return { ...NO_INPUT, dodge }
    case 'finish':
      return {
        ...NO_INPUT,
        dodge,
        move: Math.abs(e.x - h.x) > h.stats.reach - 4 ? toward : 0,
        attack: frame % 6 === 0,
      }
    default: // dodge, block, blink
      return { ...NO_INPUT, dodge }
  }
}

function training(classId: ClassId) {
  const f = newFight({
    hero: heroFighter(baseStats(classId), classId),
    enemy: enemyFighter(kindOf('Goblin'), 1),
    enemyLevel: 1,
    seed: 'training',
    timeLimitMs: 3_600_000,
  })
  return f
}

describe('combat training', () => {
  it.each(CLASS_IDS)('%s: every step can be done, in order', (classId) => {
    const steps = tutorialSteps(classId)
    const f = training(classId)
    const done: string[] = []
    let lowest = f.hero.hp
    for (const step of steps) {
      step.setup?.(f)
      const startX = f.hero.x
      let seen = f.log.length
      let ok = false
      for (let i = 0; i < 60 * 40 && !ok; i++) {
        stepFight(f, player(step.id, f, i))
        lowest = Math.min(lowest, f.hero.hp)
        // No falling before the last step
        if (step.id !== 'finish') expect(f.enemy.hp).toBeGreaterThan(0)
        ok = step.done(f, f.log.slice(seen), startX)
        seen = f.log.length
      }
      if (ok) done.push(step.id)
      else break
    }
    expect(done).toEqual(steps.map((s) => s.id))
    expect(f.winner).toBe('hero')
    // The hero is guarded the whole way
    expect(lowest).toBeGreaterThan(0)
  })

  it('teaches each class its own trick', () => {
    const ids = (c: ClassId) => tutorialSteps(c).map((s) => s.id)
    expect(ids('warrior')).toEqual(expect.arrayContaining(['block', 'shove']))
    expect(ids('warrior')).not.toContain('blink')
    expect(ids('rogue')).toEqual(expect.arrayContaining(['dodge', 'counter']))
    expect(ids('summoner')).toEqual(expect.arrayContaining(['water']))
    expect(ids('summoner')[1]).toBe('attack') // the summon
    expect(ids('archer')).toContain('blink')
    expect(ids('mage')).toContain('blink')
    for (const c of CLASS_IDS) {
      expect(ids(c)[0]).toBe('move')
      expect(ids(c).at(-1)).toBe('finish')
      expect(FIGHT_TIPS[c].length).toBeGreaterThanOrEqual(3)
    }
  })

  it('a calm enemy never dodges or jumps', () => {
    const f = training('warrior')
    f.calm = true
    for (let i = 0; i < 60 * 30; i++)
      stepFight(f, { ...NO_INPUT, attack: i % 5 === 0, move: 1 })
    expect(
      f.log.filter((e) => e.kind === 'dodged' && e.by === 'hero')
    ).toHaveLength(0)
    expect(f.enemy.z).toBe(0)
  })

  it('guards keep health at 1', () => {
    const f = training('warrior')
    f.guard = { hero: true, enemy: true }
    for (let i = 0; i < 60 * 60; i++)
      stepFight(f, { ...NO_INPUT, attack: i % 5 === 0, move: 1 })
    expect(f.enemy.hp).toBe(1)
    expect(f.winner).toBeNull()
  })
})
