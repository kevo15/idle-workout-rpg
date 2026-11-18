jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

import AsyncStorage from '@react-native-async-storage/async-storage'

import { isLandscapeRoute, useSettings } from '../useSettings'

describe('useSettings', () => {
  it('starts in portrait', () => {
    expect(useSettings.getState().orientation).toBe('portrait')
  })

  it('saves the orientation choice', async () => {
    useSettings.getState().setOrientation('landscape')
    expect(useSettings.getState().orientation).toBe('landscape')
    // persist writes asynchronously
    await new Promise((r) => setTimeout(r, 0))
    const saved = JSON.parse(
      (await AsyncStorage.getItem('rep-raiders/settings')) ?? '{}'
    )
    expect(saved.state.orientation).toBe('landscape')
  })

  it('turns only combat and the overworld sideways', () => {
    expect(isLandscapeRoute('Replay', 'landscape')).toBe(true)
    expect(isLandscapeRoute('Overworld', 'landscape')).toBe(true)
    expect(isLandscapeRoute('Fight', 'landscape')).toBe(true)
    for (const r of [
      'Title',
      'Camp',
      'Quests',
      'Hero',
      'Map',
      'Workout',
      'Plan',
    ])
      expect(isLandscapeRoute(r, 'landscape')).toBe(false)
    expect(isLandscapeRoute('Replay', 'portrait')).toBe(false)
    expect(isLandscapeRoute(undefined, 'landscape')).toBe(false)
  })
})
