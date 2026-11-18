import { goldToReach, nightGold, nightsAtLevel, regionPrice } from '../economy'
import { getRegion } from '../world'

describe('region prices', () => {
  it('pays more per night as the hero levels', () => {
    expect(nightGold(2)).toBeGreaterThan(nightGold(1))
    expect(nightsAtLevel(4)).toBeGreaterThan(nightsAtLevel(1))
  })

  it('prices the Fallen Kingdom at 1.5x the gold earned reaching level 5', () => {
    const price = getRegion('fallen-kingdom').price
    expect(price).toBe(regionPrice(5))
    expect(Math.abs(price - 1.5 * goldToReach(5))).toBeLessThanOrEqual(25)
    expect(price).toBeGreaterThan(1500)
  })

  it('keeps later regions dearer', () => {
    expect(getRegion('ashen-wastes').price).toBeGreaterThan(
      getRegion('fallen-kingdom').price
    )
  })
})
