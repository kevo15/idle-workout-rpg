import { CLASSES, CLASS_ORDER } from '../classes'

describe('classes', () => {
  it('ships Warrior and Archer as the only playable classes (roadmap D17)', () => {
    const playable = CLASS_ORDER.filter((id) => CLASSES[id].playable)
    expect(playable).toEqual(['warrior', 'archer'])
  })

  it('gives every class stat weights that sum to 1', () => {
    for (const id of CLASS_ORDER) {
      const w = CLASSES[id].statWeights
      expect(w.STR + w.END + w.AGI + w.VIT).toBeCloseTo(1)
    }
  })
})
