import { CLASS_ORDER, CLASSES } from '../classes'
import { EXERCISES, getExercise, PRIMARY_EXERCISES } from '../exercises'
import { previousDate } from '../progress'
import {
  BATCH_MAX,
  BATCH_MIN,
  FIRST_BATCH,
  MAX_AD_QUESTS,
  MAX_SCHEDULED_QUESTS,
  MINUTES_PER_DAY,
  planDay,
  QUEST_GAP_MAX,
  QUEST_GAP_MIN,
  type Quest,
} from '../quests'
import type { ClassId } from '../types'

const PLAYABLE = CLASS_ORDER.filter((id) => CLASSES[id].playable)
const scheduled = (qs: Quest[]) => qs.filter((q) => q.kind === 'scheduled')

function week(classId: ClassId, start = '2026-11-09') {
  const days: string[] = []
  let d = start
  for (let i = 0; i < 7; i++) {
    days.unshift(d)
    d = previousDate(d)
  }
  let yesterday: string[] = []
  return days.map((date) => {
    const quests = scheduled(
      planDay({
        classId,
        date,
        profileId: 'p1',
        recentPatterns: yesterday as never,
      })
    )
    yesterday = quests.map((q) => getExercise(q.exerciseId).pattern)
    return quests
  })
}

describe('planDay', () => {
  it('gives the same day for the same profile, class and date (T01)', () => {
    const input = {
      classId: 'warrior' as const,
      date: '2026-11-11',
      profileId: 'p1',
    }
    expect(planDay(input)).toEqual(planDay(input))
  })

  it('starts with 3 quests, then batches of 2–3 every 2–4 hours', () => {
    for (const classId of PLAYABLE) {
      for (const day of week(classId)) {
        expect(day.length).toBeLessThanOrEqual(MAX_SCHEDULED_QUESTS)
        day.forEach((q, i) => expect(q.id).toBe(`${q.date}:${i}`))
        const batches = [...new Set(day.map((q) => q.batch))]
        batches.forEach((b, i) => {
          const qs = day.filter((q) => q.batch === b)
          expect(b).toBe(i)
          if (b === 0) {
            expect(qs).toHaveLength(FIRST_BATCH)
            expect(qs[0].opensAt).toBe(0)
          } else {
            expect(qs.length).toBeGreaterThanOrEqual(BATCH_MIN)
            expect(qs.length).toBeLessThanOrEqual(BATCH_MAX)
          }
          // a batch opens together and closes when the next one arrives
          expect(new Set(qs.map((q) => q.opensAt)).size).toBe(1)
          const next = day.find((q) => q.batch === b + 1)
          for (const q of qs) {
            expect(q.closesAt).toBe(next ? next.opensAt : MINUTES_PER_DAY)
          }
          if (next) {
            const gap = next.opensAt - qs[0].opensAt
            expect(gap).toBeGreaterThanOrEqual(QUEST_GAP_MIN)
            expect(gap).toBeLessThanOrEqual(QUEST_GAP_MAX)
          }
        })
      }
    }
  })

  it('adds exactly MAX_AD_QUESTS ad slots after the schedule', () => {
    const qs = planDay({
      classId: 'archer',
      date: '2026-11-11',
      profileId: 'p1',
    })
    const ads = qs.filter((q) => q.kind === 'ad')
    expect(ads).toHaveLength(MAX_AD_QUESTS)
    expect(qs.slice(-MAX_AD_QUESTS)).toEqual(ads)
  })

  it('never repeats a pattern within two quests, or schedules an easier variant', () => {
    for (const classId of PLAYABLE) {
      for (const day of week(classId)) {
        day.forEach((q, i) => {
          const e = getExercise(q.exerciseId)
          expect(e.variantOf).toBeUndefined()
          for (const prev of day.slice(Math.max(0, i - 2), i)) {
            expect(getExercise(prev.exerciseId).pattern).not.toBe(e.pattern)
          }
        })
      }
    }
  })

  it('labels class quests by class affinity and world quests without it', () => {
    for (const classId of PLAYABLE) {
      for (const day of week(classId)) {
        for (const q of day) {
          const fits = getExercise(q.exerciseId).classAffinity.includes(classId)
          expect(fits).toBe(q.track === 'CLASS')
        }
      }
    }
  })

  it('keeps a week varied and roughly 60/40 class/world (T29)', () => {
    for (const classId of PLAYABLE) {
      const all = week(classId).flat()
      expect(new Set(all.map((q) => q.exerciseId)).size).toBeGreaterThanOrEqual(
        8
      )
      expect(new Set(all.map((q) => q.reward.stat))).toEqual(
        new Set(['STR', 'END', 'AGI', 'VIT'])
      )
      const classShare =
        all.filter((q) => q.track === 'CLASS').length / all.length
      expect(classShare).toBeGreaterThan(0.45)
      expect(classShare).toBeLessThan(0.75)
    }
  })

  it('rewards 2–4 points per quest', () => {
    for (const q of week('warrior').flat()) {
      expect(q.reward.amount).toBeGreaterThanOrEqual(2)
      expect(q.reward.amount).toBeLessThanOrEqual(4)
    }
  })
})

describe('exercise catalog', () => {
  it('links every easier swap to a real exercise with the same stat', () => {
    for (const e of Object.values(EXERCISES)) {
      if (e.easierId) expect(EXERCISES[e.easierId]).toBeDefined()
      if (e.variantOf) expect(EXERCISES[e.variantOf].stat).toBe(e.stat)
    }
  })

  it('has enough primary movements for both playable classes', () => {
    for (const classId of PLAYABLE) {
      const fits = PRIMARY_EXERCISES.filter((e) =>
        e.classAffinity.includes(classId)
      )
      expect(new Set(fits.map((e) => e.pattern)).size).toBeGreaterThanOrEqual(3)
    }
  })
})
