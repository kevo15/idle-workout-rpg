import { BASE_STAT_TOTAL, CLASS_ORDER, CLASSES } from '../classes'
import {
  arrivedQuests,
  availableQuests,
  baseStats,
  canAddAdQuest,
  chooseClass,
  completeQuest,
  ensurePlan,
  questBoard,
  grantAdQuest,
  harderStep,
  heroLevel,
  levelCost,
  levelInfo,
  markChapterSeen,
  newHero,
  nextQuest,
  patternsOn,
  pointsForLevel,
  QUEST_GRACE_MIN,
  restartAs,
  rollDay,
  swapEasier,
  swapHarder,
  totalStats,
  type Stats,
} from '../progress'
import { MAX_AD_QUESTS, type Quest } from '../quests'

const DATE = '2026-11-11'

/** A scheduled quest open [opensAt, closesAt) minutes after midnight. */
const quest = (
  slot: number,
  exerciseId: string,
  stat: Quest['reward']['stat'],
  amount: number,
  opensAt = 0,
  closesAt = 1440
): Quest => ({
  id: `${DATE}:${slot}`,
  date: DATE,
  slot,
  kind: 'scheduled',
  batch: 0,
  track: 'CLASS',
  opensAt,
  closesAt,
  exerciseId,
  reward: { stat, amount },
})

const warrior = () => ensurePlan(chooseClass(newHero('p1', DATE), 'warrior'))

describe('completeQuest', () => {
  it('awards the full reward once, even if completed twice (T03)', () => {
    const s0 = warrior()
    const q = quest(0, 'push-ups', 'STR', 4)
    const first = completeQuest(s0, q, 1, 30)
    expect(first.awarded).toBe(4)
    expect(first.state.stats.STR).toBe(s0.stats.STR + 4)

    const second = completeQuest(first.state, q, 2, 30)
    expect(second.duplicate).toBe(true)
    expect(second.state).toBe(first.state)
  })

  it('only completes a quest while open, plus a grace period', () => {
    const s = warrior()
    const q = quest(1, 'squats', 'END', 3, 120, 300)
    expect(() => completeQuest(s, q, 1, 60)).toThrow(/not open/)
    expect(completeQuest(s, q, 1, 200).awarded).toBe(3)
    expect(completeQuest(s, q, 1, 300 + QUEST_GRACE_MIN - 1).awarded).toBe(3)
    expect(() => completeQuest(s, q, 1, 300 + QUEST_GRACE_MIN)).toThrow()
  })

  it('rejects a quest from another day', () => {
    const s = rollDay(warrior(), '2026-11-12')
    expect(() =>
      completeQuest(s, quest(0, 'push-ups', 'STR', 3), 1, 10)
    ).toThrow()
  })
})

describe('quest batches', () => {
  it('shows the open batch plus quests already done', () => {
    const s = warrior()
    const plan = s.today.plan!.filter((q) => q.kind === 'scheduled')
    const first = plan.filter((q) => q.batch === 0)
    const second = plan.filter((q) => q.batch === 1)
    expect(availableQuests(s.today, 0)).toEqual(first)

    const now = second[0].opensAt + 1
    expect(availableQuests(s.today, now)).toEqual(second)
    const done = completeQuest(s, first[0], 1, 5).state
    expect(availableQuests(done.today, now)).toEqual([first[0], ...second])
    expect(arrivedQuests(s.today, now)).toHaveLength(
      first.length + second.length
    )
    expect(nextQuest(s.today, now)?.batch).toBe(2)
  })
})

describe('ad quests', () => {
  it('unlocks at most MAX_AD_QUESTS a day, open until midnight', () => {
    let s = warrior()
    for (let i = 0; i < 5; i++) s = grantAdQuest(s)
    expect(s.today.adQuests).toBe(MAX_AD_QUESTS)
    expect(canAddAdQuest(s.today)).toBe(false)

    const ads = s.today.plan!.filter((q) => q.kind === 'ad')
    const late = 1439
    for (const ad of ads) {
      expect(availableQuests(s.today, late)).toContain(ad)
      expect(completeQuest(s, ad, 1, late).awarded).toBe(ad.reward.amount)
    }
  })

  it('keeps ad quests locked until unlocked, and resets them daily', () => {
    const s = warrior()
    const ad = s.today.plan!.find((q) => q.kind === 'ad')!
    expect(() => completeQuest(s, ad, 1, 10)).toThrow()
    const next = rollDay(grantAdQuest(s), '2026-11-12')
    expect(next.today.adQuests).toBe(0)
  })
})

describe('easier and harder swaps', () => {
  it('steps down the easier chain and keeps the reward (T02, T32)', () => {
    const q = quest(0, 'push-ups', 'STR', 4)
    const s1 = swapEasier(warrior(), q)
    expect(s1.today.swaps[q.id]).toBe('knee-push-ups')
    const s2 = swapEasier(s1, q)
    expect(s2.today.swaps[q.id]).toBe('wall-push-ups')
    const done = completeQuest(s2, q, 1, 10)
    expect(done.awarded).toBe(4)
    expect(done.state.today.done[q.id].exerciseId).toBe('wall-push-ups')
  })

  it('toggles back up to the harder version', () => {
    const q = quest(0, 'push-ups', 'STR', 4)
    const s2 = swapEasier(swapEasier(warrior(), q), q)
    expect(harderStep(q, 'wall-push-ups')?.id).toBe('knee-push-ups')

    const up1 = swapHarder(s2, q)
    expect(up1.today.swaps[q.id]).toBe('knee-push-ups')
    const up2 = swapHarder(up1, q)
    expect(up2.today.swaps[q.id]).toBeUndefined() // back to the planned one
    expect(swapHarder(up2, q)).toBe(up2) // nothing harder than planned
  })

  it('follows the quest’s own chain when variants are shared', () => {
    // chair squats are the easier swap for both squats and the wall sit
    const wallSit = quest(0, 'wall-sit', 'END', 3)
    expect(harderStep(wallSit, 'chair-squats')?.id).toBe('wall-sit')
    const squats = quest(1, 'squats', 'END', 3)
    expect(harderStep(squats, 'chair-squats')?.id).toBe('squats')
  })
})

describe('days and classes', () => {
  it('archives completions on a new day', () => {
    const s = completeQuest(
      warrior(),
      quest(0, 'push-ups', 'STR', 3),
      1,
      10
    ).state
    const next = rollDay(s, '2026-11-12')
    expect(next.today.awarded).toBe(0)
    expect(next.history).toHaveLength(1)
    expect(patternsOn(next, DATE)).toEqual(['push'])
    expect(next.stats.STR).toBe(s.stats.STR)
  })

  it('locks the class once chosen (no free stat swap)', () => {
    const w = chooseClass(newHero('p1', DATE), 'warrior')
    expect(w.stats).toEqual(CLASSES.warrior.baseStats)
    expect(chooseClass(w, 'archer')).toBe(w)
  })

  it('restarts as a new hero with the new class base stats', () => {
    const trained = markChapterSeen(
      completeQuest(warrior(), quest(0, 'push-ups', 'STR', 3), 1, 10).state,
      'chapter-1'
    )
    const archer = restartAs(trained, 'archer')
    expect(archer.classId).toBe('archer')
    expect(archer.stats).toEqual(CLASSES.archer.baseStats)
    expect(archer.history).toEqual([])
    expect(archer.today.done).toEqual({})
    expect(archer.profileId).toBe('p1')
    // The story starts over: chapters show again as their areas open
    expect(archer.seenChapters).toEqual([])
  })
})

describe('levels', () => {
  const at = (trained: number): Stats => {
    const s = baseStats('warrior')
    return { ...s, STR: s.STR + trained }
  }

  it('gives every class the same starting total and level 1', () => {
    for (const id of CLASS_ORDER) {
      const stats = baseStats(id)
      expect(totalStats(stats)).toBe(BASE_STAT_TOTAL)
      expect(heroLevel(stats)).toBe(1)
    }
  })

  it('costs 4 more points each level: 12, 16, 20, …', () => {
    expect(pointsForLevel(1)).toBe(0)
    expect(pointsForLevel(2)).toBe(12)
    expect(pointsForLevel(3)).toBe(28)
    expect(pointsForLevel(5)).toBe(72)
    expect(pointsForLevel(10)).toBe(252)
    for (let l = 1; l < 10; l++)
      expect(pointsForLevel(l + 1) - pointsForLevel(l)).toBe(levelCost(l))
    expect(heroLevel(at(11))).toBe(1)
    expect(heroLevel(at(12))).toBe(2)
    expect(heroLevel(at(252))).toBe(10)
  })

  it('from level 6, a full day of 6–8 quests no longer covers a level', () => {
    const goodDay = 8 * 3 // 8 quests at an average of 3 points
    expect(levelCost(6)).toBeGreaterThan(goodDay)
  })

  it('reports progress within the current level', () => {
    expect(levelInfo(at(20))).toMatchObject({
      level: 2,
      into: 8,
      cost: 16,
      toNext: 8,
    })
  })
})

describe('ensurePlan and chapters', () => {
  it('plans once a class is chosen and again each new day', () => {
    const s0 = ensurePlan(newHero('p1', DATE))
    expect(s0.today.plan).toBeNull() // no class yet

    const s1 = warrior()
    expect(ensurePlan(s1).today.plan).toBe(s1.today.plan)

    const restarted = ensurePlan(restartAs(s1, 'archer'))
    expect(restarted.today.plan).not.toBe(s1.today.plan)

    const tomorrow = ensurePlan(rollDay(s1, '2026-11-12'))
    expect(tomorrow.today.plan?.[0].date).toBe('2026-11-12')
  })

  it('marks a chapter seen once', () => {
    const s = markChapterSeen(
      markChapterSeen(warrior(), 'chapter-1'),
      'chapter-1'
    )
    expect(s.seenChapters).toEqual(['chapter-1'])
  })
})

describe('questBoard', () => {
  it('shows every quest of the day with where it stands', () => {
    const s = warrior()
    const plan = s.today.plan!
    const second = plan.find((q) => q.kind === 'scheduled' && q.batch === 1)!
    // Just after the second batch arrives
    const board = questBoard(s.today, second.opensAt + 1)
    expect(board).toHaveLength(plan.length)
    const statusOf = (q: Quest) =>
      board.find((b) => b.quest.id === q.id)!.status
    for (const q of plan) {
      if (q.kind === 'ad') expect(statusOf(q)).toBe('locked')
      else if (q.batch === 0) expect(statusOf(q)).toBe('expired')
      else if (q.batch === 1) expect(statusOf(q)).toBe('open')
      else expect(statusOf(q)).toBe('upcoming')
    }
  })

  it('marks done quests done, even after their batch is gone', () => {
    let s = warrior()
    const first = s.today.plan![0]
    s = completeQuest(s, first, Date.parse(`${DATE}T00:05:00`), 5).state
    const late = questBoard(s.today, 23 * 60)
    expect(late.find((b) => b.quest.id === first.id)!.status).toBe('done')
  })
})
