import { CAMP_SITES, REGION_GATES } from '../../../rpg/world'
import { moveFeet } from '../collision'
import { TILE } from '../mapTypes'
import { overworldScale, reachAt, reachKey } from '../reach'
import { CELL, cellOf, chunksIn, drawWindow, spritesIn } from '../sceneObjects'
import { autotile } from '../terrain'
import { cameraFor, facingFor } from '../useOverworldMovement'

const sites = CAMP_SITES.filter((s) => s.mapId === 'forest')
const gates = REGION_GATES.filter((g) => g.mapId === 'forest')

describe('walking (from Shadow Sprinter)', () => {
  it('faces the way the stick points', () => {
    expect(facingFor(0, 0, 'left')).toBe('left')
    expect(facingFor(1, 0, 'down')).toBe('right')
    expect(facingFor(0, -1, 'down')).toBe('up')
    expect(facingFor(-0.7, 0.7, 'up')).toBe('left') // diagonals favour the side
  })

  it('keeps the camera inside the map', () => {
    expect(cameraFor(10, 1000, 400)).toBe(0)
    expect(cameraFor(990, 1000, 400)).toBe(600)
    expect(cameraFor(500, 1000, 400)).toBe(300)
    expect(cameraFor(50, 300, 400)).toBe(-50) // map smaller than the view
  })

  it('stops the feet at a solid and slides along it', () => {
    const wall = [{ x: 100, y: 0, width: 20, height: 200 }]
    const p = moveFeet({ x: 80, y: 100 }, 30, 5, wall, {
      width: 400,
      height: 400,
    })
    expect(p.x).toBe(100 - 8) // foot box is 16 wide
    expect(p.y).toBe(105)
  })

  it('edges dirt with the autotile corner pieces', () => {
    const q = autotile(['...', '.d.', '...'], 'd')
    expect(q).toHaveLength(4)
    // A lone tile uses the outer 3x3 edge block (rows 2-4)
    expect(q.every((b) => b.sy >= 2 * TILE)).toBe(true)
  })
})

describe('reach', () => {
  const mossy = sites.find((s) => s.id === 'mossy-clearing')!

  it('finds the campfire you stand at', () => {
    const feet = {
      x: mossy.position.x * TILE,
      y: (mossy.position.y + 1) * TILE,
    }
    const r = reachAt(feet, sites, gates)
    expect(r?.kind).toBe('site')
    expect(reachKey(r)).toBe('site:mossy-clearing')
  })

  it('finds nothing in the open', () => {
    expect(reachAt({ x: 40 * TILE, y: 40 * TILE }, sites, gates)).toBeNull()
  })

  it('finds the gate from just below it', () => {
    const g = gates[0].area
    const feet = { x: (g.x + 3) * TILE, y: (g.y + g.height + 1) * TILE }
    expect(reachKey(reachAt(feet, sites, gates))).toBe('gate:fallen-kingdom')
  })
})

describe('culling and scale', () => {
  it('shows about 11 tiles across the short side, in either orientation', () => {
    expect(overworldScale(390, 844)).toBeCloseTo(390 / (11 * TILE))
    expect(overworldScale(844, 390)).toBe(overworldScale(390, 844))
    expect(overworldScale(200, 200)).toBe(1) // never below 1
  })

  it('draws only the ground chunks near the hero', () => {
    // Portrait phone at the spawn (south middle of the forest)
    const view = { width: 390 / 1.1, height: 760 / 1.1 }
    const win = drawWindow(cellOf({ x: 60 * TILE, y: 96 * TILE }), view)
    const chunks = chunksIn(win, 3, 3)
    expect(chunks.length).toBeLessThanOrEqual(4)
    expect(chunks).toContainEqual({ col: 1, row: 2 })
    // Landscape: wider window, still not the whole map
    const wide = drawWindow(cellOf({ x: 60 * TILE, y: 50 * TILE }), {
      width: 844 / 1.1,
      height: 334 / 1.1,
    })
    expect(chunksIn(wide, 3, 3).length).toBeLessThan(9)
  })

  it('keeps each culled object’s global depth order', () => {
    const sprites = [0, 1, 2, 3].map((i) => ({
      key: `t${i}`,
      kind: { parts: [], collider: { x: 0, y: 0, width: 1, height: 1 } },
      x: i * CELL * TILE * 3,
      y: 0,
      baseline: i,
    }))
    const near = spritesIn(sprites, { x: 0, y: -10, width: 400, height: 50 })
    expect(near.map((n) => n.i)).toEqual([0])
  })
})
