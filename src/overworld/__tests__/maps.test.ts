import { CAMP_SITES, REGION_GATES, REGIONS } from '../../../rpg/world'
import { isBlocked } from '../collision'
import { MAPS } from '../maps'
import { MAP_H, MAP_W } from '../maps/region'
import { TILE, type MapDef, type Point } from '../mapTypes'
import { OBJECTS } from '../objects'
import { solidRects } from '../terrain'

/** Feet in the lower middle of tile (x, y), where feet stand. */
const feetAt = (x: number, y: number): Point => ({
  x: x * TILE + TILE / 2,
  y: y * TILE + TILE - 4,
})

/** Every tile the hero can walk to from `from` (4-way flood fill). */
function reachable(map: MapDef, from: Point): Set<string> {
  const solids = solidRects(map)
  const open = (x: number, y: number) =>
    x >= 0 &&
    y >= 0 &&
    x < MAP_W &&
    y < MAP_H &&
    !isBlocked(feetAt(x, y), solids)
  const seen = new Set<string>([`${from.x},${from.y}`])
  const queue: [number, number][] = [[from.x, from.y]]
  while (queue.length) {
    const [x, y] = queue.pop()!
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const k = `${x + dx},${y + dy}`
      if (seen.has(k) || !open(x + dx, y + dy)) continue
      seen.add(k)
      queue.push([x + dx, y + dy])
    }
  }
  return seen
}

it('gives every region an overworld map', () => {
  for (const r of REGIONS) expect(MAPS[r.mapId]).toBeDefined()
})

describe.each(REGIONS.map((r) => [r.name, MAPS[r.mapId]] as const))(
  '%s map',
  (_, map) => {
    const sites = CAMP_SITES.filter((s) => s.mapId === map.id)
    const gates = REGION_GATES.filter((g) => g.mapId === map.id)
    const walk = reachable(map, map.spawn)

    it('is 120 x 108 tiles, 3x each side of the Shadow Sprinter village', () => {
      expect(map.terrain).toHaveLength(MAP_H)
      expect(map.terrain.every((row) => row.length === MAP_W)).toBe(true)
      expect([MAP_W, MAP_H]).toEqual([40 * 3, 36 * 3])
    })

    it('only places known objects', () => {
      for (const o of map.objects) expect(OBJECTS[o.kind]).toBeDefined()
    })

    it('has camp sites with ordered level bands, all reachable', () => {
      expect(sites.length).toBeGreaterThanOrEqual(3)
      for (const s of sites) {
        expect(s.levelBand[0]).toBeLessThanOrEqual(s.levelBand[1])
        // The tile just south of the fire, where you stand to use it
        expect(walk.has(`${s.position.x},${s.position.y + 1}`)).toBe(true)
      }
    })

    it('lets you reach each gate but not walk through it', () => {
      for (const g of gates) {
        const midX = g.area.x + Math.floor(g.area.width / 2)
        expect(walk.has(`${midX},${g.area.y + g.area.height}`)).toBe(true)
        expect(walk.has(`${midX},${g.area.y}`)).toBe(false)
      }
    })

    it('starts the hero next to every camp, too', () => {
      for (const s of sites) {
        const from = { x: s.position.x, y: s.position.y + 2 }
        expect(walk.has(`${from.x},${from.y}`)).toBe(true)
      }
    })

    it('is full of trees', () => {
      const trees = map.objects.filter((o) => o.kind !== 'barrel')
      expect(trees.length).toBeGreaterThan(250)
    })
  }
)
