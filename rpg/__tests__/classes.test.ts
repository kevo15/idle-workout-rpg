import { BASE_STAT_TOTAL, CLASSES, CLASS_ORDER } from '../classes'
import { getExercise } from '../exercises'
import { WARMUP_EXERCISE } from '../expedition'

describe('classes', () => {
  it('makes all five classes playable (Phase 3 class expansion)', () => {
    const playable = CLASS_ORDER.filter((id) => CLASSES[id].playable)
    expect(playable).toEqual(['warrior', 'archer', 'mage', 'summoner', 'rogue'])
  })

  it('gives every class three abilities and the same base stat total', () => {
    for (const id of CLASS_ORDER) {
      const c = CLASSES[id]
      expect(c.abilities).toHaveLength(3)
      const b = c.baseStats
      expect(b.STR + b.END + b.AGI + b.VIT).toBe(BASE_STAT_TOTAL)
    }
  })

  it('gives every class a warm-up from its own workouts', () => {
    for (const id of CLASS_ORDER) {
      const warm = getExercise(WARMUP_EXERCISE[id])
      expect(warm.variantOf).toBeUndefined()
      expect(warm.classAffinity).toContain(id)
    }
  })

  it('gives every class stat weights that sum to 1', () => {
    for (const id of CLASS_ORDER) {
      const w = CLASSES[id].statWeights
      expect(w.STR + w.END + w.AGI + w.VIT).toBeCloseTo(1)
    }
  })
})
