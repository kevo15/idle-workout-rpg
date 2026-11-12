jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

import { CLASSES } from '../../../rpg/classes'
import {
  availableQuests,
  minutesOfDay,
  type HeroState,
} from '../../../rpg/progress'
import { MAX_AD_QUESTS } from '../../../rpg/quests'
import { migrateHero, useHero } from '../useHero'

const store = () => useHero.getState()
const now = () => minutesOfDay(Date.now())
const visible = () => availableQuests(store().today, now())
const openQuest = () => visible().find((q) => !store().today.done[q.id])!

beforeEach(() => store().reset())

describe('useHero', () => {
  it('has no quests until a class is picked, then a batch of 2–3', () => {
    expect(store().today.plan).toBeNull()
    store().pickClass('warrior')
    expect(store().classId).toBe('warrior')
    expect(store().stats).toEqual(CLASSES.warrior.baseStats)
    expect(visible().length).toBeGreaterThanOrEqual(2)
    expect(visible().length).toBeLessThanOrEqual(3)
    expect(new Set(visible().map((q) => q.batch)).size).toBe(1)
  })

  it('completes the open quest once and raises its stat by the full reward', () => {
    store().pickClass('archer')
    const base = CLASSES.archer.baseStats
    const quest = openQuest()
    expect(store().complete(quest.id)?.awarded).toBe(quest.reward.amount)
    expect(store().complete(quest.id)?.duplicate).toBe(true)
    expect(store().stats[quest.reward.stat]).toBe(
      base[quest.reward.stat] + quest.reward.amount
    )
  })

  it('won’t complete a quest that hasn’t arrived', () => {
    store().pickClass('warrior')
    const future = store().today.plan!.find(
      (q) => q.kind === 'scheduled' && q.opensAt > now() + 120
    )
    if (future) expect(store().complete(future.id)).toBeNull()
  })

  it('unlocks ad quests up to the daily limit', () => {
    store().pickClass('warrior')
    const ad = store().today.plan!.find((q) => q.kind === 'ad')!
    expect(store().complete(ad.id)).toBeNull()
    for (let i = 0; i < 5; i++) store().addAdQuest()
    expect(store().today.adQuests).toBe(MAX_AD_QUESTS)
    expect(store().complete(ad.id)?.awarded).toBe(ad.reward.amount)
  })

  it('swaps easier and back to harder, keeping the board', () => {
    store().pickClass('warrior')
    const plan = store().today.plan!
    const q = plan.find((p) => p.exerciseId === 'push-ups') ?? plan[0]
    store().swap(q.id)
    store().harder(q.id)
    expect(store().today.plan).toBe(plan)
    expect(store().today.swaps[q.id]).toBeUndefined()
  })

  it('ignores a second class pick and restarts on a class change', () => {
    store().pickClass('warrior')
    store().complete(openQuest().id)
    store().pickClass('archer')
    expect(store().classId).toBe('warrior')

    store().restart('archer')
    expect(store().classId).toBe('archer')
    expect(store().stats).toEqual(CLASSES.archer.baseStats)
    expect(store().today.done).toEqual({})
  })

  it('records a story chapter as seen', () => {
    store().seeChapter('chapter-1')
    store().seeChapter('chapter-1')
    expect(store().seenChapters).toEqual(['chapter-1'])
  })
})

describe('migrateHero', () => {
  it('moves a v1 save onto its class base and keeps trained points', () => {
    const v1 = {
      ...store(),
      classId: 'warrior' as const,
      stats: { STR: 8, END: 5, AGI: 5, VIT: 6 },
    }
    const base = CLASSES.warrior.baseStats
    expect(migrateHero(v1, 1).stats).toEqual({
      STR: base.STR + 3,
      END: base.END,
      AGI: base.AGI,
      VIT: base.VIT + 1,
    })
  })

  it('moves a v4 save to timed quests, keeping stats and completions', () => {
    const done = {
      questId: '2026-11-11:0',
      exerciseId: 'push-ups',
      stat: 'STR' as const,
      awarded: 3,
      at: 1,
    }
    const v4 = {
      ...store(),
      stats: { STR: 10, END: 5, AGI: 3, VIT: 5 },
      today: {
        ...store().today,
        date: '2026-11-11',
        done: { [done.questId]: done },
        plan: [],
        bonusQuests: 2,
        bonusStats: 1,
      },
    } as unknown as HeroState
    const m = migrateHero(v4, 4)
    expect(m.stats).toEqual(v4.stats)
    expect(m.history).toContainEqual({ ...done, date: '2026-11-11' })
    expect(m.today.done).toEqual({})
    expect(m.today.plan).toBeNull()
    expect(m.today.adQuests).toBe(0)
  })
})
