import { backDefault } from '../useBack'

describe('Android back', () => {
  it('does nothing on the home tabs and setup screens', () => {
    for (const r of ['Camp', 'Quests', 'Hero', 'Map', 'Title', 'ClassSelect'])
      expect(backDefault(r)).toBe(true)
  })
  it('goes back like the on-screen back button elsewhere', () => {
    for (const r of ['Plan', 'ReplayLog', 'Replay', 'Workout', 'Settings'])
      expect(backDefault(r)).toBe(false)
  })
})
