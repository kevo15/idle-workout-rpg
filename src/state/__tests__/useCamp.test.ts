jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

import { phaseAt } from '../../../rpg/expedition'
import { useCamp } from '../useCamp'

const camp = () => useCamp.getState()

beforeEach(() => camp().reset())

describe('useCamp', () => {
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
    camp().answer('strike')
    camp().answer('retreat') // a second answer is ignored
    expect(camp().current?.call).toBe('strike')
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
