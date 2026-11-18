jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

import { phaseAt } from '../../../rpg/expedition'
import { getRegion } from '../../../rpg/world'
import { useCamp } from '../useCamp'

const camp = () => useCamp.getState()
const KINGDOM = getRegion('fallen-kingdom').price

beforeEach(() => camp().reset())

describe('useCamp', () => {
  it('buys a region with gold, once', () => {
    useCamp.setState({ gold: KINGDOM + 500 })
    expect(camp().buyRegion('fallen-kingdom')).toBe(true)
    expect(camp().gold).toBe(500)
    expect(camp().unlocked).toContain('fallen-kingdom')
    // Buying again never charges twice
    expect(camp().buyRegion('fallen-kingdom')).toBe(false)
    expect(camp().gold).toBe(500)
  })

  it('sells regions in order', () => {
    useCamp.setState({ gold: 20000 })
    expect(camp().buyRegion('ashen-wastes')).toBe(false)
    expect(camp().gold).toBe(20000)
  })

  it('refuses a region you cannot afford, and free ones', () => {
    useCamp.setState({ gold: KINGDOM - 1 })
    expect(camp().buyRegion('fallen-kingdom')).toBe(false)
    expect(camp().buyRegion('whispering-forest')).toBe(false)
    expect(camp().gold).toBe(KINGDOM - 1)
  })

  it('selects only open areas', () => {
    expect(camp().areaId).toBe('whispering-forest')
    expect(camp().selectArea('ashen-wastes')).toBe(false)
    useCamp.setState({ gold: KINGDOM + getRegion('ashen-wastes').price })
    camp().buyRegion('fallen-kingdom')
    camp().buyRegion('ashen-wastes')
    expect(camp().selectArea('ashen-wastes')).toBe(true)
    expect(camp().areaId).toBe('ashen-wastes')
  })

  it('moves camp to another site', () => {
    expect(camp().setSite('old-mill')).toBe(true)
    expect(camp().siteId).toBe('old-mill')
    // The next expedition runs from the new site's level band
    const e = camp().start('BALANCED', 1)!
    expect(e.siteId).toBe('old-mill')
    expect(e.enemyLevel).toBeGreaterThanOrEqual(2)
  })

  it('keeps camp where it is while an expedition runs', () => {
    camp().start('BALANCED', 1)
    expect(camp().setSite('hollow-stones')).toBe(false)
    expect(camp().siteId).toBe('mossy-clearing')
  })

  it('rejects an unknown site', () => {
    expect(() => camp().setSite('nowhere')).toThrow()
    expect(camp().siteId).toBe('mossy-clearing')
  })

  it('starts one expedition at a time', () => {
    expect(camp().start('BALANCED', 1)).not.toBeNull()
    expect(camp().start('AGGRESSIVE', 1)).toBeNull()
    expect(camp().current?.approach).toBe('BALANCED')
  })

  it('uses a warm-up once, on the next expedition only', () => {
    camp().markWarmup()
    expect(camp().start('BALANCED', 1)?.warmup).toBe(true)
    expect(camp().warmupReady).toBe(false)
  })

  it('waits at the checkpoint until the player answers', () => {
    camp().start('BALANCED', 2)
    camp().devToCheckpoint()
    expect(phaseAt(camp().current!, Date.now())).toBe('WAITING')
    camp().answer('won') // took control and beat the Brute
    camp().answer('retreat') // a second answer is ignored
    expect(camp().current?.call).toBe('won')
  })

  it('banks gold once, only when the expedition is done', () => {
    camp().start('BALANCED', 2)
    expect(camp().claim()).toBeNull()
    camp().devToMorning()
    const entry = camp().claim()!
    expect(camp().gold).toBe(entry.result.gold)
    expect(camp().current).toBeNull()
    expect(camp().claim()).toBeNull()
    expect(camp().log).toHaveLength(1)
  })

  it('pays the play-through bonus once per expedition', () => {
    camp().start('BALANCED', 2)
    camp().devToMorning()
    const entry = camp().claim()!
    const before = camp().gold
    const bonus = camp().finishPlayThrough(entry.expedition.id)
    expect(bonus).toBeGreaterThan(0)
    expect(camp().gold).toBe(before + bonus)
    expect(camp().finishPlayThrough(entry.expedition.id)).toBe(0)
  })
})

describe('starting over with a new class', () => {
  it('is a full reset: expedition, gold, areas, camp and replays', () => {
    useCamp.setState({ gold: KINGDOM + 100 })
    camp().buyRegion('fallen-kingdom')
    camp().selectArea('fallen-kingdom')
    camp().setSite('kings-road')
    camp().markWarmup()
    camp().start('BALANCED', 5)
    camp().devToMorning()
    camp().claim()
    camp().start('BALANCED', 5)
    expect(camp().current).not.toBeNull()
    expect(camp().log).toHaveLength(1)

    camp().startOver()
    expect(camp().current).toBeNull()
    expect(camp().gold).toBe(0)
    expect(camp().log).toEqual([])
    expect(camp().warmupReady).toBe(false)
    expect(camp().unlocked).toEqual([])
    expect(camp().areaId).toBe('whispering-forest')
    expect(camp().siteId).toBe('mossy-clearing')
  })
})
