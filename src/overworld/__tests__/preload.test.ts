jest.mock('expo-asset', () => ({
  Asset: { loadAsync: jest.fn(() => Promise.resolve([])) },
}))

import { Asset } from 'expo-asset'

import { MAPS } from '../maps'
import {
  firstViewImages,
  loadedShare,
  mapModules,
  preloadMap,
} from '../preload'

describe('map preloading', () => {
  it('loads every ground chunk, the mini-map, the sheets and the hero', () => {
    for (const id of Object.keys(MAPS)) {
      // 9 chunks + mini + 5 sheets + 2 hero sheets
      expect(mapModules(id)).toHaveLength(9 + 1 + 5 + 2)
    }
  })

  it('reports progress up to 1, even when an image fails', async () => {
    ;(Asset.loadAsync as jest.Mock).mockImplementationOnce(() =>
      Promise.reject(new Error('missing'))
    )
    const seen: number[] = []
    await preloadMap('forest', (p) => seen.push(p))
    expect(seen).toHaveLength(mapModules('forest').length)
    expect(seen[seen.length - 1]).toBe(1)
  })
})

describe('first view readiness', () => {
  const near = [
    {
      s: {
        kind: { parts: [{ sheet: 'trunk' }, { sheet: 'treetop' }] },
      },
    },
    { s: { kind: { parts: [{ sheet: 'barrel' }] } } },
  ]

  it('waits for the ground in view, each sheet nearby, the hero and mini-map', () => {
    const keys = firstViewImages(
      [
        { col: 1, row: 2 },
        { col: 1, row: 1 },
      ],
      near
    )
    expect(keys.sort()).toEqual(
      [
        'chunk:1-2',
        'chunk:1-1',
        'sheet:trunk',
        'sheet:treetop',
        'sheet:barrel',
        'hero',
        'hero-walk',
        'mini',
      ].sort()
    )
  })

  it('counts what has loaded', () => {
    const keys = ['a', 'b', 'c', 'd']
    expect(loadedShare(keys, new Set())).toBe(0)
    expect(loadedShare(keys, new Set(['a', 'c']))).toBe(0.5)
    expect(loadedShare(keys, new Set(keys))).toBe(1)
    expect(loadedShare([], new Set())).toBe(0)
  })
})
